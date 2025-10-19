package linux

import (
	"io"
	"log/slog"
	"os"
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

	info.CPU_Temp, err = getCPUTemp()
	if err != nil {
		slog.Error("cannot get cpu temperature", "error", err)
	}

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

func getCPUTemp() (float64, error) {
	data, err := os.ReadFile("/sys/class/thermal/thermal_zone*/temp")
	if err != nil {
		return -1, err
	}
	temp, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil {
		return -1, err
	}
	return float64(temp) / 1000.0, nil
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
