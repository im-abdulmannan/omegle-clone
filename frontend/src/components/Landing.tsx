import { useState } from "react";
import { Link } from "react-router-dom";

export const Landing = () => {
  const [name, setName] = useState("");
  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
      />
      <Link
        to={`/room/?name=${name}`}
      >
        Join
      </Link>
    </div>
  );
};
