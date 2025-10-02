import { useRef, useState, type JSX } from "react";
import type { Process, SystemInfo } from "../types";
import { memoryString } from "./utils";
import { Paginated, Search } from "./Paginated";

export function ProcessesView(props: {
  serverURL: string;
  processes: Process[];
  systemInfo: SystemInfo;
}) {
  const [filteredProcesses, setFilteredProcesses] = useState<Process[]>(
    props.processes
  );
  const [pageNumber, setPageNumber] = useState(0);
  return (
    <div className="w-full bg-orange-100 flex flex-col gap-2 py-4 px-2 rounded-sm">
      <div>
        <h1 className="text-2xl font-bold">
          currently running processes ({props.processes.length})
        </h1>
      </div>
      <div className="w-full flex flex-col gap-2 pl-3">
        <Search
          list={props.processes}
          objectKeyForFilter="name"
          filteredList={filteredProcesses}
          setFilteredList={(v) => {
            setFilteredProcesses(v);
            setPageNumber(0);
          }}
        />
        <Paginated
          elements={filteredProcesses.map((proc) => (
            <Process
              key={proc.pid}
              serverURL={props.serverURL}
              processes={props.processes}
              process={proc}
              systemInfo={props.systemInfo}
            />
          ))}
          pageNumber={pageNumber}
          setPageNumber={setPageNumber}
          elementsPerPage={5}
          key={JSON.stringify({ p: filteredProcesses, s: props.systemInfo })}
        />
      </div>
    </div>
  );
}

function Process(props: {
  serverURL: string;
  processes: Process[];
  process: Process;
  systemInfo: SystemInfo;
}) {
  const signalRef = useRef<HTMLSelectElement | null>(null);
  return (
    <div className="w-full flex flex-col">
      <div className="w-full flex flex-row items-center gap-3 justify-between">
        <h2 className="text-xl">
          <b
            style={{ color: statusColor(props.process.status) }}
            title={
              props.process.name +
              " (pid: " +
              props.process.pid +
              ") is " +
              props.process.status
            }
          >
            {props.process.name}
          </b>
        </h2>
        <div className="flex flex-row gap-4 pr-2">
          <select
            className="border border-black rounded-md pl-2"
            defaultValue={"none"}
            ref={signalRef}
          >
            <option value={"none"}>choose signal</option>
            <option value={"SIGKILL"}>kill (SIGKILL)</option>
            <option value={"SIGTERM"}>terminate (SIGTERM)</option>
            <option value={"SIGSTOP"}>suspend (SIGSTOP)</option>
            <option value={"SIGCONT"}>resume (SIGCONT)</option>
          </select>
          <button
            className="bg-gray-300 px-2 py-1 rounded-sm hover:bg-gray-400"
            onClick={() => {
              fetch(
                `${props.serverURL}/api/v1/process/${
                  props.process.pid
                }/signal/${signalRef.current!.value}`,
                {
                  method: "POST",
                }
              );
            }}
          >
            send
          </button>
        </div>
      </div>
      <ul className="list-disc pl-5">
        <li>
          <span className="font-semibold">pid:</span> {props.process.pid}
        </li>
        <li>
          <span className="font-semibold">status:</span> {props.process.status}
        </li>
        <li>
          <span className="font-semibold"># of threads:</span>{" "}
          {props.process.threads}
        </li>
        <li>
          <span className="font-semibold">cpu usage:</span>{" "}
          {props.process.cpu_percent.toFixed(2)}%
        </li>
        <li>
          <span className="font-semibold">memory usage:</span>{" "}
          {memoryString(
            (props.process.memory_percent / 100) * props.systemInfo.memory
          )}{" "}
          ({props.process.memory_percent.toFixed(2)}%)
        </li>
        {props.process.num_fds !== -1 ? (
          <li>
            <span className="font-semibold">open file descriptors:</span>{" "}
            {props.process.num_fds}
          </li>
        ) : null}
        {props.process.parent_pid !== -1 ? (
          <li>
            <span className="font-semibold">parent:</span>{" "}
            {getNameOfPID(props.processes, props.process.parent_pid)}
          </li>
        ) : null}
        {props.process.children_pids ? (
          <li>
            <span className="font-semibold">children</span> (
            {props.process.children_pids.length}):{" "}
            <ShowHide useButtons={props.process.children_pids.length > 8}>
              {props.process.children_pids.map((cpid, index) => (
                <span key={cpid}>
                  {getNameOfPID(props.processes, cpid, cpid.toString())}
                  {index < props.process.children_pids.length - 1 ? ", " : ""}
                </span>
              ))}
            </ShowHide>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function ShowHide({
  useButtons,
  children,
}: {
  useButtons: boolean;
  children: React.ReactNode;
}) {
  if (!useButtons) {
    return children;
  }
  const [show, setShow] = useState(false);
  if (!show) {
    return (
      <button
        className="bg-gray-300 w-12 min-w-fit px-1 rounded-sm"
        onClick={() => setShow(true)}
      >
        show
      </button>
    );
  }
  return (
    <>
      {children}{" "}
      <button
        className="bg-gray-300 w-12 min-w-fit px-1 rounded-sm"
        onClick={() => setShow(false)}
      >
        hide
      </button>
    </>
  );
}

function getNameOfPID(
  processes: Process[],
  pid: number,
  defaultName?: string
): string {
  const proc = processes.find((p) => p.pid === pid);
  return proc ? proc.name : defaultName || "unknown";
}

function statusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "sleep":
      return "#6179ad";
    case "idle":
      return "#b0ab63";
    case "zombie":
      return "#ad6161";
    case "running":
      return "#61ad68";
    default:
      return "#000000";
  }
}
