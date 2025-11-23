import { useState } from "react";
import Landing from "./components/Landing";
import FileUploader from "./components/FileUploader";
import ResultPage from "./components/ResultPage";
import "./styles.css";

export default function App() {
  const [jobId, setJobId] = useState(null);         // AI or Not
  const [ircamJobId, setIrcamJobId] = useState(null); // Ircam Amplify
  const [cyaniteId, setCyaniteId] = useState(null); // Cyanite
  const [view, setView] = useState("landing");

  return (
    <main className="app-root">

      {view === "landing" && (
        <Landing onGetStarted={() => setView("upload")} />
      )}

      {view === "upload" && (
        <FileUploader
          onUploaded={(aiornotId, cyaniteAnalysisId, ircamId) => {
            setJobId(aiornotId);
            setCyaniteId(cyaniteAnalysisId);
            setIrcamJobId(ircamId);
            setView("result");
          }}
          onBack={() => setView("landing")}
        />
      )}

      {view === "result" && (
        <ResultPage
          jobId={jobId}
          ircamJobId={ircamJobId}
          cyaniteId={cyaniteId}
          onReset={() => {
            setJobId(null);
            setIrcamJobId(null);
            setCyaniteId(null);
            setView("upload");
          }}
        />
      )}

    </main>
  );
}
