abstract class Listener<VALUE> {
  abstract send(value: VALUE): void;
}

class StateListener<VALUE> extends Listener<VALUE> {
  private _process: DelegateProcess<unknown, unknown, VALUE>;

  constructor(process: DelegateProcess<unknown, unknown, VALUE>) {
    super();
    this._process = process;
  }

  send(value: VALUE) {
    this._process.state = value;
  }
}

class InputListener<VALUE> extends Listener<VALUE> {
  private _process: Process<unknown, VALUE>;

  constructor(process: Process<unknown, VALUE>) {
    super();
    this._process = process;
  }

  send(value: VALUE) {
    this._process.input = value;
  }
}

class OutputListener<VALUE> extends Listener<VALUE> {
  private _process: Process<VALUE, unknown>;

  constructor(process: Process<VALUE, unknown>) {
    super();
    this._process = process;
  }

  send(value: VALUE) {
    this._process.output = value;
  }
}

interface ProcessSpec<OUTPUT, INPUT> {
  type: string;
  props: {};
}

interface ComponentProcessSpec<OUTPUT, INPUT, JOIN>
  extends ProcessSpec<OUTPUT, INPUT> {
  type: "component";
  props: {
    producers: ProcessSpec<JOIN, INPUT>[];
    consumers: ProcessSpec<OUTPUT, JOIN>[];
  };
}

function isComponentSpec<OUTPUT, INPUT>(
  spec: ProcessSpec<OUTPUT, INPUT>
): spec is ComponentProcessSpec<OUTPUT, INPUT, unknown> {
  return spec.type === "component";
}

abstract class Process<OUTPUT, INPUT> {
  static create<OUT, IN>(
    spec: ProcessSpec<OUT, IN>,
    listeners: Listener<OUT>[]
  ) {
    if (isComponentSpec(spec)) {
      return new ComponentProcess(spec, listeners);
    }
    return new DelegateProcess(spec, listeners);
  }

  private _input: INPUT;
  private _listeners: Listener<OUTPUT>[];

  protected constructor(listeners: Listener<OUTPUT>[] = []) {
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

  set output(value: OUTPUT) {
    for (const listener of this._listeners) {
      listener.send(value);
    }
  }
}

interface DelegateProcessSpec<OUTPUT, INPUT, STATE>
  extends ProcessSpec<OUTPUT, INPUT> {
  type: string;
  props: {
    state?: ProcessSpec<STATE, unknown>;
  };
}

export interface ValueProducerProcessSpec<STATE>
  extends DelegateProcessSpec<STATE, void, STATE> {
  type: "value-producer";
  props: {
    state?: null;
    value: STATE;
  };
}

export class DelegateProcess<OUTPUT, INPUT, STATE> extends Process<
  OUTPUT,
  INPUT
> {
  private _runner: DelegateProcessRunner<OUTPUT, INPUT, STATE>;
  private _state: STATE;

  constructor(
    spec: DelegateProcessSpec<OUTPUT, INPUT, STATE>,
    listeners?: Listener<OUTPUT>[]
  ) {
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

export abstract class DelegateProcessRunner<OUTPUT, INPUT, STATE> {
  protected process: DelegateProcess<OUTPUT, INPUT, STATE>;

  constructor(
    process: DelegateProcess<OUTPUT, INPUT, STATE>,
    spec: DelegateProcessSpec<OUTPUT, INPUT, STATE>
  ) {
    this.process = process;
  }

  step() {}
}

class ComponentProcess<OUTPUT, INPUT, JOIN> extends Process<OUTPUT, INPUT> {
  private _producerListeners: Listener<INPUT>[];

  constructor(
    spec: ComponentProcessSpec<OUTPUT, INPUT, JOIN>,
    listeners?: Listener<OUTPUT>[]
  ) {
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

export default function main<OUTPUT, INPUT, JOIN>(
  spec: ComponentProcessSpec<OUTPUT, INPUT, JOIN>
) {
  new ComponentProcess(spec);
}
