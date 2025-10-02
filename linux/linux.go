package linux

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/process"
	"github.com/tiredkangaroo/system/system"
)

type LinuxSystem struct{}

func (ls *LinuxSystem) GetSystemInfo() (*system.SystemInfo, error) {
	staticInfo, err := getStaticSysInfo()
	if err != nil {
		return nil, err
	}
	dynamicInfo, err := getDynamicSysInfo(staticInfo.HasBattery)
	if err != nil {
		return nil, err
	}
	return &system.SystemInfo{
		StaticInfo:  staticInfo,
		DynamicInfo: dynamicInfo,
	}, nil
}
func (ls *LinuxSystem) GetSystemLogs(logOptions system.LogOptions) (io.ReadCloser, error) {
	// journalctl --since=@<timestamp> --until=@<timestamp>
	a := ls.buildLogArgs(logOptions)
	return ls.runCmdGetPipe("journalctl", a...)
}
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

func getStaticSysInfo() (system.StaticInfo, error) {
	var info system.StaticInfo
	info.OS = runtime.GOOS                                              // os
	info.CPU, _ = fieldValueFromProcFile("/proc/cpuinfo", "model name") // cpu
	info.NumCPU = runtime.NumCPU()                                      // numcpu
	info.Arch = runtime.GOARCH                                          // arch

	if hostInfo, err := host.Info(); err == nil {
		info.OSRelease = hostInfo.KernelVersion
		info.Hostname = hostInfo.Hostname
	}

	memstat, err := mem.VirtualMemory()
	if err != nil {
		return info, err
	}
	info.Memory = memstat.Total

	diskstat, err := disk.Usage("/")
	if err != nil {
		return info, err
	}
	info.StorageCapacity = diskstat.Total // total storage capacity in bytes

	// hasbattery, battery
	info.HasBattery, info.Battery = getBatteryInfo() // battery info

	return info, nil
}

func getDynamicSysInfo(hasBattery bool) (system.DynamicInfo, error) {
	var info system.DynamicInfo
	var err error

	usages, err := cpu.Percent(0, false)
	if err != nil {
		return info, err
	}
	info.CPU_Usage = usages[0] // cpu usage percentage

	memstat, err := mem.VirtualMemory()
	if err != nil {
		return info, err
	}
	info.MemoryUsed = memstat.Used

	diskstat, err := disk.Usage("/")
	if err != nil {
		return info, err
	}
	info.StorageUsed = diskstat.Used

	if hasBattery {
		// /sys/class/power_supply/BAT0/temp
		data, err := os.ReadFile("/sys/class/power_supply/BAT0/temp")
		if err == nil {
			temp, _ := strconv.Atoi(strings.TrimSpace(string(data)))
			tempCelsius := float64(temp) / 10.0
			info.BatteryTemp = tempCelsius
		}
		// /sys/class/power_supply/BAT0/capacity
		data, err = os.ReadFile("/sys/class/power_supply/BAT0/capacity")
		if err == nil {
			capacity, _ := strconv.Atoi(strings.TrimSpace(string(data)))
			info.BatteryPercent = float64(capacity)
		}
		// /sys/class/power_supply/BAT0/status
		data, err = os.ReadFile("/sys/class/power_supply/BAT0/status")
		if err == nil {
			info.BatteryStatus = strings.TrimSpace(string(data))
		}
	}

	info.Processes, err = getCurrentProcesses()
	if err != nil {
		slog.Error("cannot get host processes", "error", err)
	}

	info.Uptime, err = host.Uptime()
	if err != nil {
		slog.Error("cannot get host uptime", "error", err)
	}

	info.Services, err = getCurrentServices()
	if err != nil {
		slog.Error("cannot get services", "error", err)
	}
	return info, nil
}

func getCurrentProcesses() ([]system.Process, error) {
	processes, err := process.Processes()
	if err != nil {
		return nil, err
	}
	infoProcesses := make([]system.Process, 0, len(processes))
	for _, p := range processes {
		name, err := p.Name()
		if err != nil {
			continue
		}
		status, err := p.Status()
		if err != nil || len(status) == 0 {
			continue
		}
		parentPID := int32(-1)
		if p, err := p.Parent(); err == nil {
			parentPID = p.Pid
		}
		var childrenPIDs []int32
		children, err := p.Children()
		if err == nil {
			childrenPIDs = make([]int32, 0, len(children))
			for _, c := range children {
				childrenPIDs = append(childrenPIDs, c.Pid)
			}
		}

		infoProcesses = append(infoProcesses, system.Process{
			PID:           p.Pid,
			Name:          name,
			Status:        status[0],
			Threads:       numOrNegOne(p.NumThreads()),
			CPUPercent:    numOrNegOne(p.CPUPercent()),
			MemoryPercent: numOrNegOne(p.MemoryPercent()),
			ParentPID:     parentPID,
			NumFDs:        numOrNegOne(p.NumFDs()),
			ChildrenPIDs:  childrenPIDs,
		})
	}
	return infoProcesses, nil
}

func numOrNegOne[T int8 | int16 | int32 | int64 | float32 | float64](v T, err error) T {
	if err != nil {
		return T(-1)
	}
	return v
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

func getBatteryInfo() (bool, string) {
	base := "/sys/class/power_supply/"
	entries, err := os.ReadDir(base)
	if err != nil {
		return false, ""
	}
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "BAT") {
			battFile := base + entry.Name() + "/model_name"
			data, err := os.ReadFile(battFile)
			if err != nil {
				return true, ""
			}
			return true, strings.TrimSpace(string(data))
		}
	}
	return false, ""
}

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
	a := []string{}
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
