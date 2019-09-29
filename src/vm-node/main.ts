import * as assert from "assert";

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
    scope = new StreamScope(),
    debug = new StreamDebug()
  ): Stream<OUT, IN> {
    if (isComponentSpec(spec)) {
      return new Component(spec, listeners, scope, debug);
    }
    if (isValueSpec(spec)) {
      return new Value(spec, listeners, scope, debug);
    }
    const S: typeof Stream = require(`./api/${spec.type}.tree`).default;
    return new S(spec, listeners, scope, debug);
  }

  private _input: I;
  private readonly _listeners: Listener<O>[];

  protected constructor(
    spec: Spec<O, I>,
    listeners: Listener<O>[],
    scope: StreamScope,
    debug: StreamDebug
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

enum StreamOperator {
  CONSUMER = "\x1b[2m| \x1b[0m\x1b[31m> \x1b[0m",
  PRODUCER = "\x1b[2m| \x1b[0m\x1b[32m< \x1b[0m",
  STATE = "\x1b[2m| \x1b[0m\x1b[33m^ \x1b[0m"
}

class StreamDebug {
  // static readonly ENABLED = false;
  static readonly ENABLED = true;

  private _level: number;

  constructor(level = 0) {
    this._level = level;
  }

  nextLevel() {
    return new StreamDebug(this._level + 1);
  }

  printSpec<O, I>(spec: Spec<O, I>, operator: StreamOperator) {
    if (StreamDebug.ENABLED) {
      let info: string;
      if (isBroadcastSpec(spec) || isListenerSpec(spec)) {
        info = `\x1b[33m\x1b[1m[${spec.props.key}]\x1b[0m`;
      } else if (isComponentSpec(spec)) {
        info = `\x1b[2m${spec.type}\x1b[0m`;
      } else if (isValueSpec(spec)) {
        info = JSON.stringify(spec.props.value);
      } else {
        info = `\x1b[1m${spec.type}\x1b[0m`;
      }
      const indent = new Array(this._level).fill("\x1b[2m|   \x1b[0m").join("");
      console.debug(`${indent}${operator}${info}\x1b[0m`);
    }
  }
}

class StreamScope {
  private readonly _broadcasts = new Map<string, Broadcast<unknown>>();

  addBroadcast(key: string, broadcast: Broadcast<unknown>) {
    assert(!this._broadcasts.has(key));
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
    scope: StreamScope,
    debug: StreamDebug
  ) {
    super(spec, listeners, scope, debug);

    const consumers: Listener<J>[] = [];
    for (const consumerSpec of spec.props.consumers) {
      let consumer: Listener<J>;
      if (isBroadcastSpec(consumerSpec)) {
        debug.printSpec(consumerSpec, StreamOperator.CONSUMER);
        const broadcast = new Broadcast();
        scope.addBroadcast(consumerSpec.props.key, broadcast);
        consumer = broadcast;
      } else {
        debug.printSpec(consumerSpec, StreamOperator.CONSUMER);
        consumer = new StreamInputListener(
          Stream.create(
            consumerSpec,
            [new StreamOutputListener(this)],
            scope,
            debug.nextLevel()
          )
        );
      }
      consumers.push(consumer);
    }

    this._producers = [];
    for (const producerSpec of spec.props.producers) {
      if (isListenerSpec(producerSpec)) {
        debug.printSpec(producerSpec, StreamOperator.PRODUCER);
        scope.addBroadcastListeners(producerSpec.props.key, consumers);
      } else {
        debug.printSpec(producerSpec, StreamOperator.PRODUCER);
        this._producers.push(
          new StreamInputListener(
            Stream.create(producerSpec, consumers, scope, debug.nextLevel())
          )
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
    scope: StreamScope,
    debug: StreamDebug
  ) {
    super(spec, listeners, scope, debug);
    if (spec.props.state) {
      debug.printSpec(spec.props.state, StreamOperator.STATE);
      Stream.create(
        spec.props.state,
        [new StreamStateListener(this)],
        scope,
        debug.nextLevel()
      );
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
    scope: StreamScope,
    debug: StreamDebug
  ) {
    super(spec, listeners, scope, debug);
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
