import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">That page doesn't exist.</p>
      <Button asChild className="mt-6">
        <Link to="/library">Back to Library</Link>
      </Button>
    </div>
  );
}
