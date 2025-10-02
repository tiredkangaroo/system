import { useState } from "react";
import type { Service } from "../types";
import { Paginated, Search } from "./Paginated";

const statusOrder: Record<Service["status"], number> = {
  running: 0,
  failed: 1,
  dead: 2,
  exited: 3,
};

export function ServicesView({ services }: { services: Service[] }) {
  const [filteredServices, setFilteredServices] = useState<Service[]>(services);
  const [pageNumber, setPageNumber] = useState(0);
  return (
    <div className="w-full bg-rose-100 flex flex-col gap-2 py-4 px-2 rounded-sm">
      <div>
        <h1 className="text-2xl font-bold">services ({services.length})</h1>
      </div>
      <div className="flex flex-col gap-4">
        <Search
          list={services}
          objectKeyForFilter="name"
          filteredList={filteredServices}
          setFilteredList={(v) => {
            setFilteredServices(v);
            setPageNumber(0);
          }}
        />
        <Paginated
          elements={filteredServices
            .sort((a, b) => statusOrder[a.status] - statusOrder[b.status])
            .map((v, i) => (
              <Service service={v} key={i} />
            ))}
          pageNumber={pageNumber}
          setPageNumber={setPageNumber}
          elementsPerPage={10}
        />
      </div>
    </div>
  );
}

function Service({ service }: { service: Service }) {
  return (
    <div className="my-4">
      <div className="flex flex-row items-center gap-2">
        <div
          style={{ backgroundColor: statusColor(service.status) }}
          title={service.status}
          className="w-3 h-3 aspect-square"
        ></div>
        <h2 className="text-xl font-bold">{service.name}</h2>
      </div>
      <p className="text-sm">
        ({service.status}) {service.description}
      </p>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "running":
      return "#70ff8f";
    case "dead":
      return "#000";
    case "failed":
      return "#ff4b3b";
    case "exited":
      return "#6cc269";
  }
  return "#fff";
}
