import { Navigate, Route, Routes } from "react-router-dom";
import { useConfig } from "@/lib/queries";
import { AppShell } from "@/components/layout/AppShell";
import OnboardingPage from "@/routes/OnboardingPage";
import ConfigPage from "@/routes/ConfigPage";
import NewSkillPage from "@/routes/NewSkillPage";
import LibraryPage from "@/routes/LibraryPage";
import EditorPage from "@/routes/EditorPage";
import PlaygroundPage from "@/routes/PlaygroundPage";
import BatchPage from "@/routes/BatchPage";
import NotFound from "@/routes/NotFound";

function IndexRedirect() {
  const { data, isLoading } = useConfig();
  if (isLoading) return null;
  return <Navigate to={data?.has_key ? "/library" : "/onboarding"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<IndexRedirect />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/new" element={<NewSkillPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/skills/:slug" element={<EditorPage />} />
        <Route path="/skills/:slug/test" element={<PlaygroundPage />} />
        <Route path="/batch" element={<BatchPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
