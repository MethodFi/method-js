type TEnvironments =
  | 'production'
  | 'sandbox'
  | 'dev';

type TEventTypes =
  | 'open'
  | 'error'
  | 'exit'
  | 'success';

type TConfigurations = {
  [key in TEnvironments]: { url: string; };
};

type TElementClientEventHandler = (payload: IElementClientOnEventPayload) => void;

type TEventHandler = (event: MessageEvent) => void;

interface IEventAccountsPayload {
  public_account_token: string;
  mask: string;
}

interface IElementClientOnEventPayload {
  op: TEventTypes;
  element_type: string;
  accounts?: IEventAccountsPayload[];
}

interface IElementClientOptions {
  env?: TEnvironments,
  onEvent?: TEventHandler,
  onSuccess?: TElementClientEventHandler,
  onError?: TElementClientEventHandler,
  onExit?: TElementClientEventHandler,
  onOpen?: TElementClientEventHandler,
}

const MainModalId = 'method-elements-modal-id';

const Environments = {
  production: 'production',
  sandbox: 'sandbox',
  dev: 'dev',
};

const EventTypes = {
  open: 'open',
  error: 'error',
  exit: 'exit',
  success: 'success',
};

const Configurations: TConfigurations = {
  production: { url: 'https://elements.production.methodfi.com' },
  sandbox: { url: 'https://elements.sandbox.methodfi.com' },
  dev: { url: 'https://elements.dev.methodfi.com' },
};

const noop = (): void => {};

export default class ElementClient {
  private readonly url: string;
  private readonly eventHandler: TEventHandler;

  constructor(opts: IElementClientOptions) {
    const config = Configurations[opts.env || Environments.dev];

    this.url = config.url;
    this.eventHandler = (event) => {
      if (event.origin === this.url) this.handleElementEvent(event, opts);
    };
  }

  private close(): void {
    const modal = window.document.getElementById(MainModalId);
    if (modal) {
      modal.parentNode.removeChild(modal);
      window.document.body.style.overflow = 'inherit';
    }

    window.removeEventListener('message', this.eventHandler);
  }

  private createModalElement(href: string): Node {
    const mobileMedia = window.matchMedia('(max-width: 576px)');

    const overlay = window.document.createElement('div');
    overlay.id = MainModalId;
    overlay.style.position = 'fixed';
    overlay.style.backgroundColor = 'rgba(144, 144, 144, 0.98)';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '999999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.overflowX = 'hidden';
    overlay.style.overflowY = 'visible';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.margin = '0';
    overlay.style.paddingTop = mobileMedia.matches ? '0' : '2%';
    overlay.style.paddingBottom = mobileMedia.matches ? '0' : '4%';

    const iframe = window.document.createElement('iframe');
    iframe.src = href;
    iframe.frameBorder = '0';
    iframe.style.borderRadius = '4px';
    iframe.style.height = mobileMedia.matches ? '100%' : '650px';
    iframe.style.width = mobileMedia.matches ? '100%' : '360px';
    iframe.style.margin = 'auto';
    iframe.style.flex = '0 0 auto';

    overlay.appendChild(iframe);

    return overlay;
  }

  private handleElementEvent(event: MessageEvent, opts: IElementClientOptions): void {
    switch (event.data.type) {
      case EventTypes.open: (opts.onOpen || noop)(event.data.payload); break;
      case EventTypes.exit: (opts.onExit || noop)(event.data.payload); this.close(); break;
      case EventTypes.success: (opts.onSuccess || noop)(event.data.payload); break;
      case EventTypes.error: (opts.onError || noop)(event.data.payload); this.close(); break;
      default:
    }

    (opts.onEvent || noop)(event);
  }

  public open(token: string): void {
    if (window.document.getElementById(MainModalId)) return;

    const iframeURL = new URL(this.url);
    iframeURL.searchParams.append('token', token);
    iframeURL.searchParams.append('event_channel', 'message');

    const modal = this.createModalElement(iframeURL.href);

    window.document.body.appendChild(modal);
    window.document.body.style.overflow = 'hidden';
    window.addEventListener('message', this.eventHandler);
  }
}
