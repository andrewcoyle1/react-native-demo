/**
 * Stubs for the native SDKs, so a test can import the composition root.
 *
 * This is needed because the container imports *every* implementation in order
 * to choose between them, and the Firebase modules touch the native layer as
 * they load — `@react-native-firebase/app` builds an event emitter at module
 * scope and throws "Native module NativeRNFBTurboApp is not registered" outside
 * a real app. `createServices('mock')` constructs none of them, but importing
 * the file that could is enough.
 *
 * So these are deliberately dumb: enough shape for the modules to load and for
 * an implementation to be held as a value, and no behaviour at all. Any test
 * that wants a Firebase implementation to *do* something should mock that
 * behaviour itself rather than growing this file into a fake Firebase — the
 * mock services already exist for that, and are the thing worth testing against.
 */
jest.mock('@react-native-firebase/app', () => ({
  getApp: () => ({ name: '[TEST]', options: { projectId: 'test', appId: 'test' } }),
}));

jest.mock('@react-native-firebase/auth', () => ({
  getAuth: () => ({}),
  onAuthStateChanged: () => () => {},
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: () => () => {},
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: class {},
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: () => ({}),
  setCrashlyticsCollectionEnabled: () => Promise.resolve(),
  didCrashOnPreviousExecution: () => Promise.resolve(false),
  recordError: jest.fn(),
  log: jest.fn(),
  setUserId: jest.fn(),
  crash: jest.fn(),
}));

/*
 * Mixpanel is only constructed when a token is configured, which it is not
 * under test — but the import still has to resolve.
 */
jest.mock('mixpanel-react-native', () => ({
  Mixpanel: class {
    init = () => Promise.resolve();
    setLoggingEnabled = () => {};
    track = () => Promise.resolve();
    identify = () => Promise.resolve();
    reset = () => {};
    flush = () => {};
    optInTracking = () => {};
    optOutTracking = () => {};
    hasOptedOutTracking = () => Promise.resolve(true);
    registerSuperProperties = () => {};
    getPeople = () => ({ set: () => {} });
  },
}));
