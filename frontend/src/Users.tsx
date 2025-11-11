import { useEffect, useRef, useState } from "react";
import type { User } from "../types";

export function UsersView(props: {
  serverURL: string;
  hasPrivilege: boolean | null;
}) {
  const [userData, setUserData] = useState<User[] | null>(null);
  if (!props.hasPrivilege) {
    return <></>; // don't show anything w/o privilege
  }
  useEffect(() => {
    if (!props.hasPrivilege) {
      return;
    }
    const fetchUsers = async () => {
      // fetch users
      const resp = await fetch(`${props.serverURL}/api/v1/users`, {
        credentials: "include",
      });
      const data = await resp.json();
      console.log;
      setUserData(data);
    };
    fetchUsers();
  }, [props.hasPrivilege]);
  return (
    <div className="w-full bg-green-100 flex flex-col gap-2 py-4 px-2 rounded-sm">
      <div>
        <h1 className="text-2xl font-bold">users</h1>
      </div>
      <UserDataView
        serverURL={props.serverURL}
        users={userData}
        userData={userData}
        setUserData={setUserData}
      />
    </div>
  );
}

function UserDataView(props: {
  serverURL: string;
  users: User[] | null;
  userData: User[] | null;
  setUserData: React.Dispatch<React.SetStateAction<User[] | null>>;
}) {
  if (props.users === null) {
    return <div>Loading users...</div>;
  }
  return (
    <div className="flex flex-col gap-4">
      {props.users.map((user) => (
        <div
          key={user.username}
          className=" rounded-md p-2 gap-2 flex flex-col"
        >
          <h2 className="text-xl font-semibold">{user.username}</h2>
          <div className="flex flex-col ml-2 gap-1.5">
            {user.name && user.name != user.username && (
              <p>
                <b>full name:</b> {user.name}
              </p>
            )}
            <p>
              <b>uid:</b> {user.uid}, <b>gid:</b> {user.gid}
            </p>
            <p>
              <b>home directory:</b> {user.home_dir}
            </p>
            <div>
              <p>
                <b>sshable:</b> {user.ssh_public_keys === null ? "no" : "yes"}
              </p>
              {user.ssh_public_keys !== null && (
                <>
                  <b>ssh keys ({user.ssh_public_keys.length}):</b>
                  <div className="flex flex-col list-disc list-inside ml-4 gap-2">
                    {user.ssh_public_keys.map((key, index) => (
                      <div key={index}>
                        {key.name} (<code>{key.type}</code>){" "}
                        <button
                          className="bg-red-600 px-2 text-white rounded-md cursor-pointer"
                          onClick={() => {
                            fetch(
                              `${props.serverURL}/api/v1/users/${user.username}/ssh_keys/${key.name}`,
                              {
                                credentials: "include",
                                method: "DELETE",
                              }
                            );
                          }}
                        >
                          delete
                        </button>
                      </div>
                    ))}
                    <SSHKeyAddButton
                      username={user.username}
                      serverURL={props.serverURL}
                      userData={props.userData}
                      setUserData={props.setUserData}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SSHKeyAddButton(props: {
  username: string;
  serverURL: string;
  userData: User[] | null;
  setUserData: React.Dispatch<React.SetStateAction<User[] | null>>;
}) {
  const [inputVisible, setInputVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  if (!inputVisible) {
    return (
      <button
        className="bg-blue-600 text-white rounded-md px-4 py-0.5 cursor-pointer w-fit"
        onClick={() => {
          setInputVisible(true);
        }}
      >
        add
      </button>
    );
  }
  return (
    <>
      <textarea
        autoFocus
        placeholder="Enter SSH public key here"
        className="border border-black rounded-md p-2 w-[50%] min-w-fit"
        ref={textareaRef}
      />
      <div className="flex flex-row gap-4">
        <button
          className="border-1 border-blue-600 rounded-md px-4 py-0.5 cursor-pointer w-fit mt-2"
          onClick={() => {
            setInputVisible(false);
          }}
        >
          Cancel
        </button>
        <button
          className="bg-blue-600 text-white rounded-md px-4 py-0.5 cursor-pointer w-fit mt-2"
          onClick={() => {
            let publicKey = textareaRef?.current!.value;
            if (!publicKey) {
              return;
            }
            publicKey = publicKey.trim();
            const keyParts = publicKey.split(" ");
            if (keyParts.length < 2) {
              alert("invalid ssh public key format");
              return;
            }
            const keyType = keyParts[0];
            const keyData = keyParts[1];
            const keyName =
              keyParts.length >= 3 ? keyParts.slice(2).join(" ") : `no-name`;
            fetch(
              `${props.serverURL}/api/v1/users/${props.username}/ssh_keys`,
              {
                credentials: "include",
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ public_key: publicKey }),
              }
            )
              .then(() => {
                const updatedUsers = props.userData!.map((user) => {
                  if (user.username === props.username) {
                    return {
                      ...user,
                      ssh_public_keys: [
                        ...(user.ssh_public_keys || []),
                        { name: keyName, type: keyType, data: keyData },
                      ],
                    } as User;
                  }
                  return user;
                });
                props.setUserData(updatedUsers);
                setInputVisible(false);
              })
              .catch((err) => {
                console.error("failed to add ssh key", err);
              });
          }}
        >
          Submit
        </button>
      </div>
    </>
  );
}
