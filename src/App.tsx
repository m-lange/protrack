import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { FluentProvider, Toaster, makeStyles, tokens } from '@fluentui/react-components';
import { useThemeMode } from './theme/useThemeMode';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProjectsPage } from './pages/ProjectsPage';
import { YearPage } from './pages/YearPage';
import { MonthPage } from './pages/MonthPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { RootRedirect } from './pages/RootRedirect';
import { APP_TOASTER_ID } from './utils/toaster';

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground2,
    display: 'flex',
    flexDirection: 'column',
  },
});

function App() {
  const styles = useStyles();
  const { setMode, isDark, theme } = useThemeMode();

  return (
    <FluentProvider theme={theme} className={styles.root}>
      <ErrorBoundary>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/projekte/:year" element={<ProjectsPage isDark={isDark} onSetThemeMode={setMode} />} />
            <Route path="/jahr/:year" element={<YearPage isDark={isDark} onSetThemeMode={setMode} />} />
            <Route path="/monat/:year/:month" element={<MonthPage isDark={isDark} onSetThemeMode={setMode} />} />
            <Route path="/dashboard/:year" element={<DashboardPage isDark={isDark} onSetThemeMode={setMode} />} />
            <Route path="/einstellungen" element={<SettingsPage isDark={isDark} onSetThemeMode={setMode} />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
      <Toaster toasterId={APP_TOASTER_ID} />
    </FluentProvider>
  );
}

export default App;
