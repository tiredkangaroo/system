export function SSHView(props: {
  serverURL: string;
  hasPrivilege: boolean | null;
}) {
  if (!props.hasPrivilege) {
    return <></>; // don't show anything w/o privilege
  }
  return (
    <div className="w-full bg-indigo-100 flex flex-col gap-2 py-4 px-2 rounded-sm">
      <div>
        <h1 className="text-2xl font-bold">ssh</h1>
      </div>
      <div className="flex flex-col gap-4"></div>
    </div>
  );
}
