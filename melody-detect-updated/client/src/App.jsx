import { useState } from "react";
import FileUploader from "./components/FileUploader";
import ResultPage from "./components/ResultPage";

export default function App() {
  const [jobId, setJobId] = useState(null);
  const [view, setView] = useState("upload");

  return (
    <main className="app">
      {view === "upload" && (
        <FileUploader
          onUploaded={(id) => {
            setJobId(id);
            setView("result");
          }}
        />
      )}
      {view === "result" && (
        <ResultPage jobId={jobId} onReset={() => setView("upload")} />
      )}
    </main>
  );
}
