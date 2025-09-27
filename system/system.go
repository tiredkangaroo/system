package system

import (
	"io"
	"time"
)

type System interface {
	GetSystemInfo() (*SystemInfo, error)
	GetSystemLogs(logOptions LogOptions) (io.ReadCloser, error)
	GetServiceLog(serviceName string, logOptions LogOptions) (io.ReadCloser, error)
}

type LogOptions struct {
	Since        *time.Time
	Until        *time.Time
	ThisBootOnly bool
}

type SystemInfo struct {
	StaticInfo
	DynamicInfo
}

type StaticInfo struct {
	OS        string `json:"os"`
	OSRelease string `json:"os_release"`

	Hostname string `json:"hostname"`

	CPU    string `json:"cpu"`     // cpu model
	NumCPU int    `json:"num_cpu"` // number of cpu cores
	Arch   string `json:"arch"`    // architecture

	Memory uint64 `json:"memory"` // total memory in bytes

	StorageCapacity uint64 `json:"storage_capacity"` // total storage capacity in bytes

	HasBattery bool   `json:"has_battery"`       // whether the system has a battery
	Battery    string `json:"battery,omitempty"` // battery model
}

type DynamicInfo struct {
	CPU_Usage float64 `json:"cpu_usage"` // cpu usage percentage

	MemoryUsed  uint64 `json:"memory_used"`  // used memory in bytes
	StorageUsed uint64 `json:"storage_used"` // used storage in bytes

	BatteryTemp    float64 `json:"battery_temp"`    // battery temperature in celsius
	BatteryPercent float64 `json:"battery_percent"` // battery percentage
	BatteryStatus  string  `json:"battery_status"`  // battery status (e.g., charging, discharging, full)

	Processes []Process `json:"processes"` // list of running processes
	Services  []Service `json:"services"`  // list of services
	Uptime    uint64    `json:"uptime"`    // system uptime in seconds
}

type Service struct {
	Name        string `json:"name"`   // service name
	Status      string `json:"status"` // service status (e.g., running, stopped)
	Description string `json:"description,omitempty"`
}

type Process struct {
	PID    int32  `json:"pid"`    // process ID
	Name   string `json:"name"`   // process name
	Status string `json:"status"` // process status (e.g., running, sleep, stop, blocked)
}

const InfoRefreshInterval = 5 * time.Second

type SystemInfoService struct {
	sys                 System
	lastInfo            *SystemInfo
	timeOfLastInfo      time.Time
	infoRefreshInterval time.Duration
}

func (s *SystemInfoService) GetSystemInfo() (*SystemInfo, error) {
	if time.Since(s.timeOfLastInfo) < s.infoRefreshInterval && s.lastInfo != nil {
		return s.lastInfo, nil
	}
	info, err := s.sys.GetSystemInfo()
	if err != nil {
		return nil, err
	}
	s.lastInfo = info
	s.timeOfLastInfo = time.Now()
	return s.lastInfo, nil
}

func NewSystemInfoService(sys System, infoRefreshInterval time.Duration) *SystemInfoService {
	return &SystemInfoService{
		sys:                 sys,
		infoRefreshInterval: infoRefreshInterval,
	}
}
