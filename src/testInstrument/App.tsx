import { DeviceFlowParams } from "@navigraph/auth";
import { useState } from "react";
import { useNavigraphAuth } from "./Api/Naivgraph/hooks/useNavigraphAuth";
import { charts } from "./Api/Naivgraph/lib/navigraph";
import { Chart } from "@navigraph/charts";
import QRCode from "qrcode.react";

function App() {
  const [params, setParams] = useState<DeviceFlowParams | null>(null);
  const [chartIndex, setChartIndex] = useState<Chart[]>([]);
  const [chartBlob, setChartBlob] = useState<Blob | null>(null);

  const { user, initialized, signIn } = useNavigraphAuth();

  const handleSignIn = () => signIn((p) => setParams(p));

  const fetchChartsIndex = (icao = "KJFK") =>
    charts.getChartsIndex({ icao }).then((d) => d && setChartIndex(d));

  const loadChart = (chart: Chart) =>
    charts.getChartImage({ chart }).then((b) => setChartBlob(b));

  return (
    <main className="bg-[#363636] min-h-screen text-white p-5 text-center">
      <h1 className="text-2xl font-bold">Navigraph SDK Demo</h1>

      {!initialized && <div>Loading...</div>}

      {!params && !user && (
        <button className="p-2 bg-cyan-500 mt-5" onClick={handleSignIn}>
          Sign in
        </button>
      )}

      {params?.verification_uri_complete && !user && (
        <div className="flex flex-col items-center mt-5">
          <QRCode value={params.verification_uri_complete} size={250} />
          <a
            className="mt-5 text-blue-500"
            href={params.verification_uri_complete}
            target="_blank"
            rel="noreferrer"
          >
            Open sign in page
          </a>
        </div>
      )}

      {user && (
        <>
          <h2 className="mt-5">
            Welcome,{" "}
            <strong className="text-cyan-500">{user.preferred_username}</strong>
          </h2>
          {!chartIndex.length && (
            <button
              className="p-2 bg-cyan-500 mt-2"
              onClick={() => fetchChartsIndex()}
            >
              Fetch KJFK charts index
            </button>
          )}
        </>
      )}

      <div className="flex max-w-[650px] mx-auto mt-8 h-[500px]">
        <div className="flex w-2/3 bg-gray-900 items-center justify-center">
          {chartBlob ? (
            <img
              className="w-full h-full object-contain"
              src={URL.createObjectURL(chartBlob)}
              alt="chart"
            />
          ) : (
            "No chart loaded"
          )}
        </div>
        <div className="flex flex-col w-1/2 h-full ml-4 space-y-1 overflow-auto bg-gray-900 items-center justify-center">
          {chartIndex.length
            ? chartIndex.map((c) => (
                <button
                  key={c.id}
                  className="p-2 bg-black w-full"
                  onClick={() => loadChart(c)}
                >
                  <span className="text-xs">{c.name}</span>
                </button>
              ))
            : "No index loaded"}
        </div>
      </div>
    </main>
  );
}

export default App;
