package system

type System interface {
	GetSystemInfo() (*SystemInfo, error)
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
	PID    int    `json:"pid"`    // process ID
	Name   string `json:"name"`   // service name
	Status string `json:"status"` // service status (e.g., running, stopped)
}

type Process struct {
	PID    int32  `json:"pid"`    // process ID
	Name   string `json:"name"`   // process name
	Status string `json:"status"` // process status (e.g., running, sleep, stop, blocked)
}
