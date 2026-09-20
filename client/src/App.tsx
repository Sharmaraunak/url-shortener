import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { createShortUrl, type ShortUrlResponse } from "./api/shortenurl-api";

function App() {
  const [url, setUrl] = useState("");
  const [shortUrlData, setShortUrlData] = useState<ShortUrlResponse>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const shortenUrl = async () => {
    const data = await createShortUrl(url);
    setShortUrlData(data);
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center w-full p-3 bg-accent">
      <Field>
        <FieldLabel htmlFor="name">Long URL</FieldLabel>
        <Input
          id="url"
          autoComplete="off"
          placeholder="https://localhost:3000"
          className="rounded-lg"
          value={url}
          onChange={handleChange}
        />
        <FieldDescription>
          This should be a valid URL for you to be redirected.
        </FieldDescription>
      </Field>
      <Button
        variant="outline"
        className="items-center mt-2 rounded-lg"
        onClick={shortenUrl}
      >
        Shorten URL
      </Button>

      {shortUrlData && (
        <Button variant="link">
          <a
            href={shortUrlData.short_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {shortUrlData.short_url}
          </a>
        </Button>
      )}
    </div>
  );
}

export default App;
