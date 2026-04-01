export type ConnectivityStatus = "online" | "offline" | "degraded";

type Listener = (status: ConnectivityStatus) => void;

class ConnectivityStateMachine {
  private status: ConnectivityStatus = "online";
  private listeners: Set<Listener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.status = navigator.onLine ? "online" : "offline";
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.transition("online");
  };

  private handleOffline = () => {
    this.transition("offline");
  };

  private transition(next: ConnectivityStatus) {
    if (this.status !== next) {
      this.status = next;
      this.listeners.forEach((fn) => fn(this.status));
    }
  }

  getStatus(): ConnectivityStatus {
    return this.status;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setDegraded() {
    this.transition("degraded");
  }
}

let instance: ConnectivityStateMachine | null = null;

export function getConnectivity(): ConnectivityStateMachine {
  if (!instance) instance = new ConnectivityStateMachine();
  return instance;
}
