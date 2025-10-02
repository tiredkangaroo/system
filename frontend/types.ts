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
  battery_temp: number; // used
  battery_percent: number; // used
  battery_status: string; // used
  processes: Process[]; // used
  services: Service[];
  uptime: number; // used
}

export interface Process {
  pid: number;
  name: string;
  status: string;
  threads: number;
  cpu_percent: number;
  memory_percent: number;
  parent_pid: number;
  num_fds: number;
  children_pids: number[];
}

export interface Service {
  name: string;
  status: string;
  description: string;
}
