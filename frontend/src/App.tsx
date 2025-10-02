import { useEffect, useState } from "react";
import { type SystemInfo } from "../types";

function App() {
  const [serverURL, setServerURL] = useState<string | null>(
    localStorage.getItem("serverURL")
  );
  const [currentInfo, setCurrentInfo] = useState<SystemInfo | undefined>(
    undefined
  );
  const [wsReadyState, setWsReadyState] = useState<number | null>(null);
  useEffect(() => {
    if (!serverURL) return;
    const ws = new WebSocket(`${serverURL}/api/v1/info/ws`);
    ws.onopen = () => {
      setWsReadyState(ws.readyState);
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCurrentInfo(data);
      setWsReadyState(ws.readyState);
    };
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setWsReadyState(ws.readyState);
    };
    ws.onclose = () => {
      setWsReadyState(ws.readyState);
    };
    return () => {
      ws.close();
    };
  }, [serverURL]);

  return (
    <div className="w-full h-full p-2 flex flex-col gap-2">
      <ServerURLInput serverURL={serverURL} setServerURL={setServerURL} />
      <SystemInfoDisplay info={currentInfo} wsReadyState={wsReadyState} />
    </div>
  );
}

interface SystemInfoDisplayProps {
  info: SystemInfo | undefined;
  wsReadyState: number | null;
}
function SystemInfoDisplay(props: SystemInfoDisplayProps) {
  if (!props.info) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center">
        No data
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col gap-5">
      <div className="w-full bg-yellow-100 flex flex-col gap-2 py-4 rounded-sm">
        <p className="pl-1">
          <b className="text-2xl">static information for</b>{" "}
          <code className="text-xl">{props.info.hostname}</code>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 pl-3">
          <p>
            <b>os</b>:{" "}
            <code>
              {props.info.os} {props.info.os_release}{" "}
            </code>
          </p>
          <p>
            <b>cpu</b>: <code>{props.info.cpu}</code> on{" "}
            <code>{props.info.arch}</code>{" "}
          </p>
          <p>
            <b>cpu physical core count</b>: {props.info.num_cpu}
          </p>
          <p>
            <b>memory</b>: {memoryString(props.info.memory)}
          </p>
          <p>
            <b>storage</b>: {memoryString(props.info.storage_capacity)}
          </p>
          {props.info.has_battery ? (
            <p>
              <b>battery name</b>: <code>{props.info.battery}</code>
            </p>
          ) : (
            <p>
              <b>battery</b>: not present
            </p>
          )}
        </div>
      </div>
      <div className="w-full bg-blue-100 flex flex-col gap-2 py-4 rounded-sm">
        <div className="flex flex-row px-1 justify-between">
          <div>
            <b className="text-2xl">dynamic information for</b>{" "}
            <code className="text-xl">{props.info.hostname}</code>
          </div>
          <div
            style={{
              backgroundColor:
                props.wsReadyState === WebSocket.OPEN ? "#05a839" : "#ab0c03",
            }}
            title={
              props.wsReadyState === WebSocket.OPEN
                ? "connected to host (information is live)"
                : "not connected to host (information is stale)"
            }
            className="rounded-4xl w-4 h-4 aspect-square text-white"
          >
            {" "}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12 pl-3">
          <div className="flex flex-col gap-2">
            cpu usage: {props.info.cpu_usage.toFixed(2)}%
            <PercentageBar percentage={props.info.cpu_usage} />
          </div>
          <div className="flex flex-col gap-2">
            memory usage:{" "}
            {((props.info.memory_used / props.info.memory) * 100).toFixed(2)}%
            <PercentageBar
              percentage={(props.info.memory_used / props.info.memory) * 100}
            />
          </div>
          <div className="flex flex-col gap-2">
            storage usage: {memoryString(props.info.storage_used)} /{" "}
            {memoryString(props.info.storage_capacity)} bytes (
            {(
              (props.info.storage_used / props.info.storage_capacity) *
              100
            ).toFixed(2)}
            %)
            <PercentageBar
              percentage={
                (props.info.storage_used / props.info.storage_capacity) * 100
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PercentageBar(props: { percentage: number }) {
  let backgroundColor = "#00ba3b";
  if (props.percentage >= 90) {
    backgroundColor = "#9f0712";
  } else if (props.percentage >= 75) {
    backgroundColor = "#bfb308";
  }
  return (
    <div className="w-[200px] h-2 border-1 border-black rounded-sm">
      <div
        style={{
          width: props.percentage * 2,
          backgroundColor: backgroundColor,
        }}
        className="h-full"
      ></div>
    </div>
  );
}

interface ServerURLInputProps {
  serverURL: string | null;
  setServerURL: (url: string) => void;
}
function ServerURLInput(props: ServerURLInputProps) {
  return (
    <div className="flex flex-row gap-2 justify-center items-center">
      URL:
      <input
        type="text"
        defaultValue={props.serverURL || ""}
        onBlur={(e) => {
          props.setServerURL(e.target.value);
          localStorage.setItem("serverURL", e.target.value);
        }}
        className="border border-gray-600 rounded-md py-1 px-2 w-full text-sm"
      />
    </div>
  );
}

function memoryString(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes < 1024 * 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
}
export default App;
