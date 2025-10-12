package linux

import "os/exec"

func (ls *LinuxSystem) Shutdown() error {
	return exec.Command("systemctl", "poweroff").Run()
}
func (ls *LinuxSystem) Reboot() error {
	return exec.Command("systemctl", "reboot").Run()
}
