package linux

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

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

	usages, err := cpu.Percent(time.Second, false)
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

	processes, err := process.Processes()
	if err != nil {
		return info, err
	}
	info.Processes = make([]system.Process, 0, len(processes))
	for _, p := range processes {
		name, err := p.Name()
		if err != nil {
			continue
		}
		status, err := p.Status()
		if err != nil {
			continue
		}
		info.Processes = append(info.Processes, system.Process{
			PID:    p.Pid,
			Name:   name,
			Status: status[0],
		})
	}

	info.Uptime, err = host.Uptime()
	if err != nil {
		return info, err
	}

	info.Services = []system.Service{}
	output, err := exec.Command("systemctl", "list-units", "--type=service", "--state=running,failed").Output()
	if err != nil {
		return info, err
	}
	lines := strings.Split(string(output), "\n")
	if len(lines) < 3 {
		return info, nil
	}
	for _, line := range lines[1:] {
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}
		info.Services = append(info.Services, system.Service{
			Name:        fields[0],
			Status:      fields[3], // sub
			Description: strings.Join(fields[4:], " "),
		})
	}

	return info, nil
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
		return "", err
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
	return "", fmt.Errorf("field %s not found in %s", field, filename)
}
