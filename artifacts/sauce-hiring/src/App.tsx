import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Brand, Shell } from '@/components/kit';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import WorkspacePage from '@/pages/workspace';
import ProfilePage from '@/pages/profile';
import NewOpportunityPage from '@/pages/new-opportunity';
import OpportunityPage from '@/pages/opportunity';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: (n, e) => n < 2 && (e as { status?: number })?.status !== 404 && (e as { status?: number })?.status !== 403 } },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#1e2c28',
    colorForeground: '#1e2c28',
    colorMutedForeground: '#626b62',
    colorDanger: '#b83a24',
    colorBackground: '#fffdf7',
    colorInput: '#fffdf7',
    colorInputForeground: '#1e2c28',
    colorNeutral: '#1e2c28',
    fontFamily: 'Arial, Helvetica, sans-serif',
    borderRadius: '8px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf7] rounded-[12px] w-[440px] max-w-full overflow-hidden border border-[#dcded4] shadow-[10px_10px_0_#d6dfce]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: { fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: '30px', letterSpacing: '-0.04em', color: '#1e2c28' },
    headerSubtitle: { color: '#626b62' },
    socialButtonsBlockButtonText: { color: '#1e2c28', fontWeight: 600 },
    formFieldLabel: { color: '#1e2c28', fontWeight: 700, fontSize: '12px' },
    footerActionLink: { color: '#e2492f', fontWeight: 700 },
    footerActionText: { color: '#626b62' },
    dividerText: { color: '#626b62' },
    identityPreviewEditButton: { color: '#e2492f' },
    formFieldSuccessText: { color: '#3e5634' },
    alertText: { color: '#1e2c28' },
    logoBox: 'justify-center',
    logoImage: 'rounded-[10px]',
    socialButtonsBlockButton: 'border border-[#c9cdbf] bg-[#fbf8f1] rounded-full',
    formButtonPrimary: 'bg-[#1e2c28] text-[#fbf8f1] rounded-full font-bold normal-case',
    formFieldInput: 'bg-[#fffdf7] border border-[#c9cdbf] text-[#1e2c28]',
    footerAction: 'bg-[#f4f1e7]',
    dividerLine: 'bg-[#dcded4]',
    alert: 'bg-[#fff4ec] border border-[#d9ac99]',
    otpCodeFieldInput: 'border border-[#c9cdbf] text-[#1e2c28]',
    formFieldRow: '',
    main: '',
  },
};

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] min-w-0 grid-cols-1 bg-background md:grid-cols-[1fr_1.1fr]">
      <div className="hidden flex-col justify-between bg-[var(--mint)] p-12 md:flex">
        <Brand />
        <div>
          <p className="eyebrow">Internal test · synthetic data only</p>
          <h1 className="mt-5 text-[56px]">Evidence in their <em>own voice.</em> Decisions by people.</h1>
        </div>
        <p className="text-[11px] text-[var(--muted-ink)]">No scores are configured. No transcripts are invented.</p>
      </div>
      <div className="flex items-center justify-center px-4 py-10">{children}</div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthFrame>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

function SignUpPage() {
  return (
    <AuthFrame>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthFrame>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/workspace" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function protect(Page: ComponentType) {
  return function Protected() {
    return (
      <>
        <Show when="signed-in">
          <Shell>
            <RoutedErrorBoundary><Page /></RoutedErrorBoundary>
          </Shell>
        </Show>
        <Show when="signed-out">
          <Redirect to="/" />
        </Show>
      </>
    );
  };
}

const Workspace = protect(WorkspacePage);
const Profile = protect(ProfilePage);
const NewOpportunity = protect(NewOpportunityPage);
const OpportunityDetail = protect(OpportunityPage);

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to your Sauce hiring workspace' } },
        signUp: { start: { title: 'Create your account', subtitle: 'Share job evidence by voice' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/workspace" component={Workspace} />
            <Route path="/profile" component={Profile} />
            <Route path="/opportunities/new" component={NewOpportunity} />
            <Route path="/opportunities/:id" component={OpportunityDetail} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
