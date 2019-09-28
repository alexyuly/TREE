abstract class Listener<T> {
  abstract send(value: T): void;
}

class StateListener<T> extends Listener<T> {
  private _process: DelegateProcess<unknown, unknown, T>;

  constructor(process: DelegateProcess<unknown, unknown, T>) {
    super();
    this._process = process;
  }

  send(value: T) {
    this._process.state = value;
  }
}

class InputListener<T> extends Listener<T> {
  private _process: Process<unknown, T>;

  constructor(process: Process<unknown, T>) {
    super();
    this._process = process;
  }

  send(value: T) {
    this._process.input = value;
  }
}

class OutputListener<T> extends Listener<T> {
  private _process: Process<T, unknown>;

  constructor(process: Process<T, unknown>) {
    super();
    this._process = process;
  }

  send(value: T) {
    this._process.output = value;
  }
}

interface ProcessSpec<O, I> {
  type: string;
  props: {};
}

interface ComponentProcessSpec<O, I, J> extends ProcessSpec<O, I> {
  type: "component";
  props: {
    producers: ProcessSpec<J, I>[];
    consumers: ProcessSpec<O, J>[];
  };
}

function isComponentSpec<O, I>(
  spec: ProcessSpec<O, I>
): spec is ComponentProcessSpec<O, I, unknown> {
  return spec.type === "component";
}

abstract class Process<O, I> {
  static create<OUT, IN>(
    spec: ProcessSpec<OUT, IN>,
    listeners: Listener<OUT>[]
  ) {
    if (isComponentSpec(spec)) {
      return new ComponentProcess(spec, listeners);
    }
    return new DelegateProcess(spec, listeners);
  }

  private _input: I;
  private _listeners: Listener<O>[];

  protected constructor(listeners: Listener<O>[] = []) {
    this._listeners = listeners;
  }

  protected abstract _run(): void;

  get input() {
    return this._input;
  }

  set input(value) {
    this._input = value;
    this._run();
  }

  set output(value: O) {
    for (const listener of this._listeners) {
      listener.send(value);
    }
  }
}

interface DelegateProcessSpec<O, I, S> extends ProcessSpec<O, I> {
  type: string;
  props: {
    state?: ProcessSpec<S, unknown>;
  };
}

export interface ValueProducerProcessSpec<S>
  extends DelegateProcessSpec<S, void, S> {
  type: "value-producer";
  props: {
    state?: null;
    value: S;
  };
}

export class DelegateProcess<O, I, S> extends Process<O, I> {
  private _runner: DelegateProcessRunner<O, I, S>;
  private _state: S;

  constructor(spec: DelegateProcessSpec<O, I, S>, listeners?: Listener<O>[]) {
    super(listeners);
    const { default: Runner } = require(`./api/${spec.type}.tree`);
    this._runner = new Runner(this, spec);
    if (spec.props.state) {
      Process.create(spec.props.state, [new StateListener(this)]);
      // TODO The state process should listen through its input.
    }
  }

  _run() {
    this._runner.step();
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this._state = value;
  }
}

export abstract class DelegateProcessRunner<O, I, S> {
  protected process: DelegateProcess<O, I, S>;

  constructor(
    process: DelegateProcess<O, I, S>,
    spec: DelegateProcessSpec<O, I, S>
  ) {
    this.process = process;
  }

  step() {}
}

class ComponentProcess<O, I, J> extends Process<O, I> {
  private _producerListeners: Listener<I>[];

  constructor(spec: ComponentProcessSpec<O, I, J>, listeners?: Listener<O>[]) {
    super(listeners);
    const consumerListeners = spec.props.consumers.map(
      x => new InputListener(Process.create(x, [new OutputListener(this)]))
    );
    this._producerListeners = spec.props.producers.map(
      x => new InputListener(Process.create(x, consumerListeners))
    );
  }

  _run() {
    for (const producerListener of this._producerListeners) {
      producerListener.send(this.input);
    }
  }
}

export default function main<O, I, J>(spec: ComponentProcessSpec<O, I, J>) {
  new ComponentProcess(spec);
}
