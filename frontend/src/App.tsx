import { useEffect, useState } from "react";
import { type SystemInfo } from "../types";

function App() {
  const [serverURL, setServerURL] = useState<string | null>(
    localStorage.getItem("serverURL")
  );
  const [currentInfo, setCurrentInfo] = useState<SystemInfo | undefined>(
    undefined
  );
  useEffect(() => {
    if (!serverURL) return;
    fetch(`${serverURL}/api/v1/info`)
      .then((response) => response.json())
      .then((data) => setCurrentInfo(data))
      .catch((error) => console.error("error fetching system info:", error));
  }, [serverURL]);

  return (
    <div className="w-full h-full p-2 flex flex-col gap-2">
      <ServerURLInput serverURL={serverURL} setServerURL={setServerURL} />
      <SystemInfoDisplay info={currentInfo} />
    </div>
  );
}

interface SystemInfoDisplayProps {
  info: SystemInfo | undefined;
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
        <p className="pl-1">
          <b className="text-2xl">dynamic information for</b>{" "}
          <code className="text-xl">{props.info.hostname}</code>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 pl-3"></div>
      </div>
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
