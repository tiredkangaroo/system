package linux

import (
	"fmt"
	"log/slog"
	"os"
	user "os/user"
	"path/filepath"
	"slices"
	"strconv"
	"strings"

	"github.com/tiredkangaroo/system/system"
)

var (
	ErrUserNotFound = os.ErrNotExist
)

var commonShells = []string{
	"bash",
	"zsh",
	"sh",
	"ksh",
	"csh",
	"tcsh",
	"fish",
	"dash",
	"ash",
	"pwsh",
}

func (ls *LinuxSystem) ListUsers() ([]system.User, error) {
	data, err := os.ReadFile("/etc/passwd")
	if err != nil {
		return nil, err
	}
	lines := strings.Split(string(data), "\n")
	var users []system.User
	for _, line := range lines {
		parts := strings.SplitN(line, ":", 7) // where first part is username, second part is rest
		if len(parts) < 7 {
			continue
		}
		username := parts[0]

		var publicSSHKeys []system.SSHPublicKey
		shell := parts[6]
		shellSplit := strings.Split(shell, "/")
		shellName := shellSplit[len(shellSplit)-1]
		if slices.Contains(commonShells, shellName) {
			publicSSHKeys, err = ls.ListSSHPublicKeys(username)
			if err != nil {
				slog.Error("list ssh public keys", "username", username, "error", err)
			}
		} else {
			slog.Info("skipping ssh public key listing for user with non-shell shell", "username", username, "shell", shell)
		}
		users = append(users, system.User{
			Username:      parts[0],
			Uid:           parts[2],
			Gid:           parts[3],
			Name:          parts[4],
			HomeDir:       parts[5],
			SSHPublicKeys: publicSSHKeys,
		})
	}
	return users, nil
}

func (ls *LinuxSystem) ListSSHPublicKeys(username string) ([]system.SSHPublicKey, error) {
	u, err := user.Lookup(username)
	if err != nil {
		slog.Error("lookup user", "username", username, "error", err)
		return nil, ErrUserNotFound
	}

	authKeysFilename := filepath.Join(u.HomeDir, ".ssh", "authorized_keys")
	data, err := os.ReadFile(authKeysFilename)
	if err != nil {
		slog.Error("read authorized_keys file", "file", authKeysFilename, "error", err)
		return nil, err
	}

	var keys []system.SSHPublicKey
	lines := strings.Split(string(data), "\n")
	if len(lines) == 0 {
		return []system.SSHPublicKey{}, nil // non-nil empty slice
	}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") { // skip empty lines and comments
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue // invalid line
		}
		keyType := parts[0]    // ssh-rsa
		keyData := parts[1]    // key
		keyName := "<no-name>" // name
		if len(parts) >= 3 {
			keyName = strings.Join(parts[2:], " ") // join the rest as name
		}
		// ensure no duplicates are returned
		var duplicate bool
		for _, k := range keys {
			if k.Type == keyType && k.Key == keyData && k.Name == keyName {
				duplicate = true
				break
			}
		}
		if duplicate {
			continue
		}
		keys = append(keys, system.SSHPublicKey{
			Type: keyType,
			Key:  "omit",
			Name: keyName,
		})
	}
	return keys, nil
}

func (ls *LinuxSystem) AddSSHPublicKey(username string, publicKey string) error {
	u, err := user.Lookup(username)
	if err != nil {
		slog.Error("lookup user", "username", username, "error", err)
		return ErrUserNotFound
	}

	sshDir := filepath.Join(u.HomeDir, ".ssh")
	if err := os.MkdirAll(sshDir, 0700); err != nil { // create .ssh dir if not exists
		slog.Error("create .ssh directory", "dir", sshDir, "error", err)
		return err
	}
	if err := os.Chown(sshDir, atoi(u.Uid), atoi(u.Gid)); err != nil { // ensure perms for the dir
		slog.Error("chown .ssh directory", "dir", sshDir, "error", err)
		return err
	}
	authKeysFilename := filepath.Join(sshDir, "authorized_keys")

	f, err := os.OpenFile(authKeysFilename, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0600)
	if err != nil {
		slog.Error("open authorized_keys file", "file", authKeysFilename, "error", err)
		return err
	}
	defer f.Close()

	if _, err := f.WriteString(strings.TrimSpace(publicKey) + "\n"); err != nil {
		slog.Error("write public key", "file", authKeysFilename, "error", err)
		return err
	}

	if err := os.Chown(authKeysFilename, atoi(u.Uid), atoi(u.Gid)); err != nil { // ensure perms for the file
		slog.Error("chown authorized_keys file", "file", authKeysFilename, "error", err)
		return err
	}

	return nil
}

func (ls *LinuxSystem) RemoveSSHPublicKey(username string, keyName string) error { // will remove all instances of the key with the given name (including duplicates)
	return fmt.Errorf("not implemented for linux")
}

func atoi(s string) int {
	n, _ := strconv.Atoi(s)
	return n
}
