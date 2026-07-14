export function MdxChapter({ body }: { body: string }) {
  const lines = body.split("\n");

  return (
    <article className="max-w-none">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) {
          return (
            <h3 key={index} className="mt-0 text-base font-semibold">
              {line.replace("### ", "")}
            </h3>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <div key={index} className="ml-1 flex gap-2 text-sm text-muted-foreground">
              <span className="mt-2 size-1 rounded-full bg-primary" />
              <span>{line.replace("- ", "")}</span>
            </div>
          );
        }
        if (!line.trim()) {
          return <div key={index} className="h-2" />;
        }
        return (
          <p key={index} className="text-sm leading-6 text-muted-foreground">
            {line}
          </p>
        );
      })}
    </article>
  );
}
