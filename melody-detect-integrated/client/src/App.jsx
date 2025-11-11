import { useState } from "react";
import Landing from "./components/Landing";
import FileUploader from "./components/FileUploader";
import ResultPage from "./components/ResultPage";
import "./styles.css";

export default function App() {
  const [jobId, setJobId] = useState(null);
  const [view, setView] = useState("landing"); // landing -> upload -> result

  return (
    <main className="app-root">
      {view === "landing" && <Landing onGetStarted={() => setView("upload")} />}

      {view === "upload" && (
        <FileUploader
          onUploaded={(id) => {
            setJobId(id);
            setView("result");
          }}
          onBack={() => setView("landing")}
        />
      )}

      {view === "result" && (
        <ResultPage jobId={jobId} onReset={() => setView("upload")} />)
      }
    </main>
  );
}