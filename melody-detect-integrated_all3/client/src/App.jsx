import { useState } from "react";
import Landing from "./components/Landing";
import FileUploader from "./components/FileUploader";
import ResultPage from "./components/ResultPage";
import "./styles.css";

export default function App() {
  const [jobId, setJobId] = useState(null);          // AI or Not
  const [ircamJobId, setIrcamJobId] = useState(null); // IRCAM
  const [view, setView] = useState("landing");

  return (
    <main className="app-root">
      {view === "landing" && (
        <Landing onGetStarted={() => setView("upload")} />
      )}

      {view === "upload" && (
        <FileUploader
          onUploaded={(aiJobId, irJobId) => {
            setJobId(aiJobId);
            setIrcamJobId(irJobId);
            setView("result");
          }}
          onBack={() => setView("landing")}
        />
      )}

      {view === "result" && (
        <ResultPage
          jobId={jobId}
          ircamJobId={ircamJobId}
          onReset={() => {
            setJobId(null);
            setIrcamJobId(null);
            setView("upload");
          }}
        />
      )}
    </main>
  );
}
