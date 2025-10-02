import type { Process } from "../types";

export function ProcessesView(props: {
  serverURL: string;
  processes: Process[];
}) {
  return (
    <div className="w-full bg-orange-100 flex flex-col gap-2 py-4 px-1 rounded-sm">
      <div>
        <h1 className="text-2xl font-bold">
          currently running processes ({props.processes.length})
        </h1>
      </div>
      <div className="flex flex-col gap-2 pl-3">
        {props.processes.map((proc) => (
          <Process key={proc.pid} serverURL={props.serverURL} process={proc} />
        ))}
      </div>
    </div>
  );
}

function Process(props: { serverURL: string; process: Process }) {
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
          <button
            className="bg-gray-300 px-2 rounded-md cursor-pointer"
            title={"kill " + props.process.name}
          >
            kill
          </button>
          <button
            className="bg-gray-300 px-2 rounded-md cursor-pointer"
            title={"terminate " + props.process.name}
          >
            terminate
          </button>
        </div>
      </div>
      <ul className="list-disc pl-5">
        <li>pid: {props.process.pid}</li>
        <li>status: {props.process.status}</li>
      </ul>
    </div>
  );
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
