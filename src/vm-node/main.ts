import * as assert from "assert";

interface Spec<OUT, IN> {
  type: string;
  props: {};
}

interface StoreSpec<OUT, IN, STATE> extends Spec<OUT, IN> {
  type: string;
  props: {
    state: Spec<STATE, null>;
  };
}

interface ComponentSpec<OUT, IN, JOIN> extends Spec<OUT, IN> {
  type: "component";
  props: {
    producers: Spec<JOIN, IN>[];
    consumers: Spec<OUT, JOIN>[];
  };
}

interface GateSpec<OUT, IN> extends Spec<OUT, IN> {
  type: "gate" | "switch";
  props: {
    conditions: Spec<boolean, IN>[];
    positive: Spec<OUT, IN>;
  };
}

interface SwitchSpec<OUT, IN> extends GateSpec<OUT, IN> {
  type: "switch";
  props: {
    conditions: Spec<boolean, IN>[];
    positive: Spec<OUT, IN>;
    negative: Spec<OUT, IN>;
  };
}

interface ValueSpec<T> extends Spec<T, null> {
  type: "value";
  props: {
    value: T;
  };
}

interface ListenerSpec<T> extends Spec<T, T> {
  type: "listener";
  props: {
    key: string;
  };
}

interface BroadcastSpec<T> extends Spec<T, T> {
  type: "broadcast";
  props: {
    key: string;
  };
}

function isComponentSpec<O, I>(
  spec: Spec<O, I>
): spec is ComponentSpec<O, I, unknown> {
  return spec.type === "component";
}

function isGateSpec<O, I>(spec: Spec<O, I>): spec is GateSpec<O, I> {
  return spec.type === "gate";
}

function isSwitchSpec<O, I>(spec: Spec<O, I>): spec is SwitchSpec<O, I> {
  return spec.type === "switch";
}

function isValueSpec<T>(spec: Spec<T, null>): spec is ValueSpec<T> {
  return spec.type === "value";
}

function isListenerSpec<T>(spec: Spec<T, T>): spec is ListenerSpec<T> {
  return spec.type === "listener";
}

function isBroadcastSpec<T>(spec: Spec<T, T>): spec is BroadcastSpec<T> {
  return spec.type === "broadcast";
}

class StreamScope {
  private readonly _broadcasts = new Map<string, Broadcast<unknown>>();

  addBroadcast(key: string, broadcast: Broadcast<unknown>) {
    assert(!this._broadcasts.has(key));
    this._broadcasts.set(key, broadcast);
  }

  addListeners(key: string, listeners: Listener<unknown>[]) {
    this._broadcasts.get(key).addListeners(listeners);
  }
}

abstract class Stream<O, I> {
  static create<OUT, IN>(
    spec: Spec<OUT, IN>,
    listeners: Listener<OUT>[] = [],
    scope = new StreamScope()
  ): Stream<OUT, IN> {
    if (isComponentSpec(spec)) {
      return new Component(spec, listeners, scope);
    }
    if (isGateSpec(spec)) {
      return new Gate(spec, listeners, scope);
    }
    if (isSwitchSpec(spec)) {
      return new Switch(spec, listeners, scope);
    }
    if (isValueSpec(spec)) {
      return new Value(spec, listeners, scope);
    }
    const StreamType: typeof Unknown = require(`./api/${spec.type}.tree`)
      .default;
    return new StreamType(spec, listeners, scope);
  }

  private _input: I;
  private readonly _listeners: Listener<O>[];

  protected constructor(
    spec: Spec<O, I>,
    listeners: Listener<O>[],
    scope: StreamScope
  ) {
    this._listeners = listeners;
  }

  abstract run(): any;

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

abstract class Store<O, I, S> extends Stream<O, I> {
  private _state: S;

  constructor(
    spec: StoreSpec<O, I, S>,
    listeners: Listener<O>[],
    scope: StreamScope
  ) {
    super(spec, listeners, scope);
    if (spec.props.state) {
      Stream.create(spec.props.state, [new StreamStateListener(this)], scope);
    }
  }

  get state() {
    return this._state;
  }

  set state(value) {
    this._state = value;
  }
}

abstract class ImmediateStream<O, I> extends Stream<O, I> {
  abstract run(): O;
}

abstract class ImmediateStore<O, I, S> extends Store<O, I, S> {
  abstract run(): O;
}

class Unknown<O, I> extends Stream<O, I> {
  run() {}
}

class Component<O, I, J> extends Stream<O, I> {
  private readonly _producers: Listener<I>[];

  constructor(
    spec: ComponentSpec<O, I, J>,
    listeners: Listener<O>[],
    scope: StreamScope
  ) {
    super(spec, listeners, scope);

    const consumers: Listener<J>[] = [];
    for (const consumerSpec of spec.props.consumers) {
      let consumer: Listener<J>;
      if (isBroadcastSpec(consumerSpec)) {
        const broadcast = new Broadcast();
        scope.addBroadcast(consumerSpec.props.key, broadcast);
        consumer = broadcast;
      } else {
        consumer = new StreamInputListener(
          Stream.create(consumerSpec, [new StreamOutputListener(this)], scope)
        );
      }
      consumers.push(consumer);
    }

    this._producers = [];
    for (const producerSpec of spec.props.producers) {
      if (isListenerSpec(producerSpec)) {
        scope.addListeners(producerSpec.props.key, consumers);
      } else {
        this._producers.push(
          new StreamInputListener(Stream.create(producerSpec, consumers, scope))
        );
      }
    }
  }

  run() {
    for (const producer of this._producers) {
      producer.send(this.input);
    }
  }
}

class Gate<O, I> extends Stream<O, I> {
  private _conditions: ImmediateStream<boolean, I>[];
  private _positive: Stream<O, I>;

  constructor(
    spec: GateSpec<O, I>,
    listeners: Listener<O>[],
    scope: StreamScope
  ) {
    super(spec, listeners, scope);
    this._positive = Stream.create(
      spec.props.positive,
      [new StreamOutputListener(this)],
      scope
    );
    this._conditions = [];
    for (const conditionSpec of spec.props.conditions) {
      this._conditions.push(Stream.create(conditionSpec, [], scope));
    }
  }

  run(): boolean {
    let conditionResult = false;
    for (const condition of this._conditions) {
      condition.input = this.input;
      if (condition.run()) {
        conditionResult = true;
      } else {
        break;
      }
    }
    if (conditionResult) {
      this._positive.input = this.input;
    }
    return conditionResult;
  }
}

class Switch<O, I> extends Gate<O, I> {
  private _negative: Stream<O, I>;

  constructor(
    spec: SwitchSpec<O, I>,
    listeners: Listener<O>[],
    scope: StreamScope
  ) {
    super(spec, listeners, scope);
    this._negative = Stream.create(
      spec.props.negative,
      [new StreamOutputListener(this)],
      scope
    );
  }

  run() {
    let conditionResult = super.run();
    if (!conditionResult) {
      this._negative.input = this.input;
    }
    return conditionResult;
  }
}

class Value<T> extends Stream<T, null> {
  constructor(
    spec: ValueSpec<T>,
    listeners: Listener<T>[],
    scope: StreamScope
  ) {
    super(spec, listeners, scope);
    this.output = spec.props.value;
  }

  run() {}
}

abstract class Listener<T> {
  abstract send(value: T): void;
}

class Broadcast<T> extends Listener<T> {
  private readonly _listeners: Listener<T>[] = [];

  addListeners(listeners: Listener<T>[]) {
    this._listeners.push(...listeners);
  }

  send(value: T) {
    setTimeout(() => {
      for (const listener of this._listeners) {
        listener.send(value);
      }
    }, 0);
  }
}

class StreamOutputListener<T> extends Listener<T> {
  private readonly _stream: Stream<T, unknown>;

  constructor(stream: Stream<T, unknown>) {
    super();
    this._stream = stream;
  }

  send(value: T) {
    this._stream.output = value;
  }
}

class StreamInputListener<T> extends Listener<T> {
  private readonly _stream: Stream<unknown, T>;

  constructor(stream: Stream<unknown, T>) {
    super();
    this._stream = stream;
  }

  send(value: T) {
    this._stream.input = value;
  }
}

class StreamStateListener<T> extends Listener<T> {
  private readonly _stream: Store<unknown, unknown, T>;

  constructor(stream: Store<unknown, unknown, T>) {
    super();
    this._stream = stream;
  }

  send(value: T) {
    this._stream.state = value;
  }
}

export { ImmediateStore, ImmediateStream, Store, Stream };

export default function main(spec: Spec<unknown, unknown>) {
  Stream.create(spec);
}
