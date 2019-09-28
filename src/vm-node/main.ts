interface ProcessSpec<O, I> {
  type: string;
  props: {};
}

interface DelegateProcessSpec<O, I, S> extends ProcessSpec<O, I> {
  type: string;
  props: {
    state?: ProcessSpec<S, void>;
  };
}

interface ValueProcessSpec<T> extends ProcessSpec<T, void> {
  type: "value";
  props: {
    value: T;
  };
}

interface ComponentProcessSpec<O, I, J> extends ProcessSpec<O, I> {
  type: "component";
  props: {
    producers: ProcessSpec<J, I>[];
    consumers: ProcessSpec<O, J>[];
  };
}

function isComponentProcessSpec<O, I>(
  spec: ProcessSpec<O, I>
): spec is ComponentProcessSpec<O, I, unknown> {
  return spec.type === "component";
}

function isValueProcessSpec<O>(
  spec: ProcessSpec<O, void>
): spec is ValueProcessSpec<O> {
  return spec.type === "value";
}

abstract class Process<O, I> {
  static create<OUT, IN>(
    spec: ProcessSpec<OUT, IN>,
    listeners: Listener<OUT>[]
  ) {
    if (isComponentProcessSpec(spec)) {
      return new ComponentProcess(spec, listeners);
    }
    if (isValueProcessSpec(spec)) {
      return new ValueProcess(spec, listeners);
    }
    const DerivedDelegateProcess: typeof DelegateProcess = require(`./api/${spec.type}.tree`)
      .default;
    return new DerivedDelegateProcess(spec, listeners);
  }

  private _input: I;
  private _listeners: Listener<O>[];

  protected constructor(listeners: Listener<O>[] = []) {
    this._listeners = listeners;
  }

  protected run() {}

  get input() {
    return this._input;
  }

  set input(value) {
    this._input = value;
    this.run();
  }

  set output(value: O) {
    for (const listener of this._listeners) {
      listener.send(value);
    }
  }
}

class DelegateProcess<O, I, S> extends Process<O, I> {
  private _state: S;

  constructor(spec: DelegateProcessSpec<O, I, S>, listeners?: Listener<O>[]) {
    super(listeners);
    if (spec.props.state) {
      Process.create(spec.props.state, [new StateListener(this)]);
    }
  }

  // protected init() {}
  protected run() {}

  get state() {
    return this._state;
  }

  set state(value) {
    this._state = value;
  }
}

class ValueProcess<T> extends Process<T, void> {
  constructor(spec: ValueProcessSpec<T>, listeners?: Listener<T>[]) {
    super(listeners);
    this.output = spec.props.value;
  }
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
    // TODO Connect each Store with its correct InputListeners.
  }

  run() {
    for (const producerListener of this._producerListeners) {
      producerListener.send(this.input);
    }
  }
}

abstract class Listener<T> {
  abstract send(value: T): void;
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

export { DelegateProcess };

export default function main<O, I, J>(spec: ComponentProcessSpec<O, I, J>) {
  new ComponentProcess(spec);
}
