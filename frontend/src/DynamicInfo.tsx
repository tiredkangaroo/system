import type { SystemInfo } from "../types";
import { memoryString } from "./utils";

export function DynamicInfoView(props: { info: SystemInfo }) {
  const battery_percent =
    props.info.battery_status === "Full" ? 100 : props.info.battery_percent;
  return (
    <div className="w-full bg-blue-100 flex flex-col gap-2 py-4 rounded-sm">
      <div className="flex flex-row px-2 justify-between">
        <div>
          <b className="text-2xl">dynamic information for</b>{" "}
          <code className="text-xl">{props.info.hostname}</code>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 pl-3">
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
        {props.info.has_battery ? (
          <div className="flex flex-col gap-2">
            <p>
              battery: {battery_percent}% (status {props.info.battery_status})
            </p>
            <PercentageBar percentage={battery_percent} reverseColor={true} />{" "}
          </div>
        ) : null}
        {props.info.has_battery ? (
          <p>
            battery temperature:{" "}
            <span style={{ color: temperatureColor(props.info.battery_temp) }}>
              {props.info.battery_temp}°C
            </span>
          </p>
        ) : null}
        <p>uptime: {(props.info.uptime / 3600).toFixed(2)} hours </p>
      </div>
    </div>
  );
}

function temperatureColor(temp: number): string {
  if (temp <= 45) {
    return "#00661d"; // green
  } else if (temp <= 60) {
    return "#636601"; // yellow
  } else {
    return "#660b01"; // red
  }
}

function PercentageBar(props: { percentage: number; reverseColor?: boolean }) {
  let backgroundColor = "#00ba3b";
  // why does this look like those "code war crimes" memes?
  // have i become what i hate?
  if (!props.reverseColor) {
    if (props.percentage >= 90) {
      backgroundColor = "#9f0712";
    } else if (props.percentage >= 75) {
      backgroundColor = "#bfb308";
    }
  } else {
    if (props.percentage <= 10) {
      backgroundColor = "#9f0712";
    } else if (props.percentage <= 20) {
      backgroundColor = "#bfb308";
    }
  }
  return (
    <div className="w-[200px] h-2 border-1 border-black rounded-sm">
      <div
        style={{
          width: props.percentage * 2,
          backgroundColor: backgroundColor,
        }}
        className="h-full rounded-lg"
      ></div>
    </div>
  );
}
