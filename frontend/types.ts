export interface SystemInfo {
  os: string;
  os_release: string;
  hostname: string;
  cpu: string;
  num_cpu: number;
  arch: string;
  memory: number;
  storage_capacity: number;
  has_battery: boolean;
  battery: string;
  cpu_usage: number;
  memory_used: number;
  storage_used: number;
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
