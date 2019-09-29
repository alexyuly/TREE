interface Spec<OUT, IN> {
  type: string;
  props: {};
}

interface BroadcastSpec<T> extends Spec<T, T> {
  type: "broadcast";
  props: {
    key: string;
  };
}

interface ComponentSpec<OUT, IN, JOIN> extends Spec<OUT, IN> {
  type: "component";
  props: {
    producers: Spec<JOIN, IN>[];
    consumers: Spec<OUT, JOIN>[];
  };
}

interface ListenerSpec<T> extends Spec<T, T> {
  type: "listener";
  props: {
    key: string;
  };
}

interface StaticStreamSpec<OUT, IN, STATE> extends Spec<OUT, IN> {
  type: string;
  props: {
    state: Spec<STATE, null>;
  };
}

interface ValueSpec<T> extends Spec<T, null> {
  type: "value";
  props: {
    value: T;
  };
}

function isBroadcastSpec<T>(spec: Spec<T, T>): spec is BroadcastSpec<T> {
  return spec.type === "broadcast";
}

function isComponentSpec<O, I>(
  spec: Spec<O, I>
): spec is ComponentSpec<O, I, unknown> {
  return spec.type === "component";
}

function isListenerSpec<T>(spec: Spec<T, T>): spec is ListenerSpec<T> {
  return spec.type === "listener";
}

function isValueSpec<T>(spec: Spec<T, null>): spec is ValueSpec<T> {
  return spec.type === "value";
}

class Stream<O, I> {
  static create<OUT, IN>(
    spec: Spec<OUT, IN>,
    listeners: Listener<OUT>[] = [],
    scope = new StreamScope()
  ): Stream<OUT, IN> {
    if (isComponentSpec(spec)) {
      return new Component(spec, listeners, scope);
    }
    if (isValueSpec(spec)) {
      return new Value(spec, listeners, scope);
    }
    const S: typeof Stream = require(`./api/${spec.type}.tree`).default;
    return new S(spec, listeners, scope);
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

class StreamScope {
  private readonly _broadcasts = new Map<string, Broadcast<unknown>>();

  addBroadcast(key: string, broadcast: Broadcast<unknown>) {
    if (this._broadcasts.has(key)) {
      throw new Error();
    }
    this._broadcasts.set(key, broadcast);
  }

  addBroadcastListeners(key: string, listeners: Listener<unknown>[]) {
    this._broadcasts.get(key).addListeners(listeners);
  }
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
        scope.addBroadcastListeners(producerSpec.props.key, consumers);
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

class StaticStream<O, I, S> extends Stream<O, I> {
  private _state: S;

  constructor(
    spec: StaticStreamSpec<O, I, S>,
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

class Value<T> extends Stream<T, null> {
  constructor(
    spec: ValueSpec<T>,
    listeners: Listener<T>[],
    scope: StreamScope
  ) {
    super(spec, listeners, scope);
    this.output = spec.props.value;
  }
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
  private readonly _stream: StaticStream<unknown, unknown, T>;

  constructor(stream: StaticStream<unknown, unknown, T>) {
    super();
    this._stream = stream;
  }

  send(value: T) {
    this._stream.state = value;
  }
}

export { Stream, StaticStream };

export default function main(spec: Spec<unknown, unknown>) {
  Stream.create(spec);
}
