export interface SystemInfo {
  os: string; // used
  os_release: string; // used
  hostname: string; // used
  cpu: string; // used
  num_cpu: number; // used
  arch: string; // used
  memory: number; // used
  storage_capacity: number; // used
  has_battery: boolean; // used
  battery: string; // used
  cpu_usage: number; // used
  memory_used: number; // used
  storage_used: number; // used
  battery_temp: number;
  battery_percent: number;
  battery_status: string;
  processes: Process[];
  services: Service[];
  uptime: number;
}

export interface Process {
  pid: number;
  name: string;
  status: string;
}

export interface Service {
  name: string;
  status: string;
  description: string;
}
