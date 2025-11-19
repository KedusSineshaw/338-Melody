import { useState } from "react";
import Landing from "./components/Landing";
import FileUploader from "./components/FileUploader";
import ResultPage from "./components/ResultPage";
import "./styles.css";

export default function App() {
  const [jobId, setJobId] = useState(null);         // AI or Not
  const [cyaniteId, setCyaniteId] = useState(null); // Cyanite
  const [view, setView] = useState("landing");

  return (
    <main className="app-root">

      {view === "landing" && (
        <Landing onGetStarted={() => setView("upload")} />
      )}

      {view === "upload" && (
        <FileUploader
          onUploaded={(aiornotId, cyaniteAnalysisId) => {
            setJobId(aiornotId);
            setCyaniteId(cyaniteAnalysisId);
            setView("result");
          }}
          onBack={() => setView("landing")}
        />
      )}

      {view === "result" && (
        <ResultPage
          jobId={jobId}
          cyaniteId={cyaniteId}
          onReset={() => {
            setJobId(null);
            setCyaniteId(null);
            setView("upload");
          }}
        />
      )}

    </main>
  );
}
