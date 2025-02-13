// src/App.tsx
import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout/Layout";
import { ExploreView } from "./components/Explore/ExploreView";
import { PlaygroundView } from "./components/Playground/PlaygroundView";
import { PreFillForm } from "./components/shared/PreFillForm";
import { UserContext } from "./types";
import { Toaster, toast } from "react-hot-toast";
import { GoogleTagManager } from "./components/shared/GoogleTagManager";

function App() {
  const [userContext, setUserContext] = useState<UserContext | null>(null);

  const handleError = (message: string) => {
    toast.error(message);
  };

  const handleSuccess = (message: string) => {
    toast.success(message);
  };

  if (!userContext) {
    return (
      <div className="min-h-screen bg-background text-white p-4">
        <PreFillForm onSubmit={(context) => setUserContext(context)} />
      </div>
    );
  }

  return (
    <Router>
      <GoogleTagManager />
      <div className="min-h-screen bg-background text-white">
        <Toaster position="top-right" />
        <Layout>
          <Routes>
            <Route
              path="/"
              element={
                <ExploreView onError={handleError} userContext={userContext} />
              }
            />
            <Route
              path="/playground"
              element={
                <PlaygroundView
                  onError={handleError}
                  onSuccess={handleSuccess}
                  userContext={userContext}
                />
              }
            />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
