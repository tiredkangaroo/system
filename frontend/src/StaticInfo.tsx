import type { SystemInfo } from "../types";
import { memoryString } from "./utils";

export function StaticInfoView(props: { info: SystemInfo }) {
  return (
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
  );
}
