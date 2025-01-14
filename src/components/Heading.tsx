import { Link } from "@tanstack/react-router";

function Heading() {
    return <>
        <div>
            <Link to="/" activeProps={{ className: "font-bold" }} activeOptions={{ exact: true }}>Home</Link>
            {" "}
            <Link to="/about" activeProps={{ className: "font-bold" }}>About</Link>
        </div>
        <hr />
    </>;
}