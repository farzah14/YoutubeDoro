"use client";

interface HeaderProps {
  quote: string;
  showQuote?: boolean;
}

export function Header({ quote, showQuote = true }: HeaderProps) {
  return (
    <header className="scene-header">
      <div className="scene-brand">
        <h1>YoutubeDoro</h1>
        <p>anime focus room</p>
      </div>
      {showQuote && <blockquote className="scene-quote">“{quote}”</blockquote>}
    </header>
  );
}
