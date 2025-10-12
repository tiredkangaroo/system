package linux

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"

	"github.com/tiredkangaroo/system/system"
)

func fieldValueFromProcFile(filename string, field string) (string, error) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return "unknown", err
	}
	for line := range strings.SplitSeq(string(data), "\n") {
		if strings.HasPrefix(line, field) {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) != 2 {
				continue
			}
			return strings.TrimSpace(parts[1]), nil
		}
	}
	return "unknown", fmt.Errorf("field %s not found in %s", field, filename)
}

func (ls LinuxSystem) buildLogArgs(logOptions system.LogOptions) []string {
	a := []string{"-o", "short-full"}
	if logOptions.ThisBootOnly {
		a = append(a, "-b")
	}
	if logOptions.Since != nil {
		a = append(a, fmt.Sprintf("--since=@%d", logOptions.Since.Unix()))
	}
	if logOptions.Until != nil {
		a = append(a, fmt.Sprintf("--until=@%d", logOptions.Until.Unix()))
	}
	return a
}
func (ls *LinuxSystem) runCmdGetPipe(cmdName string, args ...string) (io.ReadCloser, error) {
	cmd := exec.Command(cmdName, args...)
	pipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	return pipe, nil
}

func numOrNegOne[T int8 | int16 | int32 | int64 | float32 | float64](v T, err error) T {
	if err != nil {
		return T(-1)
	}
	return v
}
