package linux

import (
	"fmt"
	"io"
	"os/exec"
	"strings"

	"github.com/tiredkangaroo/system/system"
)

func (ls *LinuxSystem) GetServiceLog(serviceName string, logOptions system.LogOptions) (io.ReadCloser, error) {
	// journalctl -u <serviceName> --since=@<timestamp> --until=@<timestamp>
	a := []string{"-u", serviceName}
	a = append(a, ls.buildLogArgs(logOptions)...)
	return ls.runCmdGetPipe("journalctl", a...)
}
func (ls *LinuxSystem) StartService(serviceName string) error {
	cmd := exec.Command("systemctl", "start", serviceName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("start service: %s, output: %s", err.Error(), string(output))
	}
	return nil
}
func (ls *LinuxSystem) StopService(serviceName string) error {
	cmd := exec.Command("systemctl", "stop", serviceName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("stop service: %s, output: %s", err.Error(), string(output))
	}
	return nil
}
func (ls *LinuxSystem) RestartService(serviceName string) error {
	cmd := exec.Command("systemctl", "restart", serviceName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("restart service: %s, output: %s", err.Error(), string(output))
	}
	return nil
}

func getCurrentServices() ([]system.Service, error) {
	var services []system.Service
	output, err := exec.Command("systemctl", "list-units", "--all", "--type=service", "--state=running,failed,exited,dead").Output()
	if err != nil {
		return nil, err
	}
	lines := strings.Split(string(output), "\n")
	if len(lines) < 3 {
		return nil, fmt.Errorf("malformed systemctl data")
	}
	for _, line := range lines[1:] { // skips over column names
		fields := strings.Fields(line)
		if len(fields) < 5 {
			break // end of services list
		}
		skipIndexes := 0
		if !strings.HasSuffix(fields[0], ".service") { // sometimes the first part of the line is not service name (e.g: ● on failed units)
			if len(fields) < 6 {
				continue // cannot parse this line
			}
			skipIndexes = 1
		}
		if fields[skipIndexes+1] != "loaded" {
			continue // not-found or whatever else may be in this field, ignore
		}
		services = append(services, system.Service{
			Name:        fields[skipIndexes],
			Status:      fields[skipIndexes+3], // sub
			Description: strings.Join(fields[skipIndexes+4:], " "),
		})
	}
	return services, nil
}
