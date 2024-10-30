/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

export interface ConfigOptions {
  /**
   * The Posthog endpoint to which analytics data will be sent.
   */
  posthog?: {
    api_key: string;
    api_host: string;
  };
  /**
   * The Sentry endpoint to which crash data will be sent.
   */
  sentry?: {
    DSN: string;
    environment: string;
  };
  /**
   * The rageshake server to which feedback and debug logs will be sent.
   */
  rageshake?: {
    submit_url: string;
  };

  /**
   * Sets the URL to send opentelemetry data to. If unset, opentelemetry will
   * be disabled.
   */
  opentelemetry?: {
    collector_url: string;
  };

  // Describes the default homeserver to use. The same format as Element Web
  // (without identity servers as we don't use them).
  default_server_config?: {
    ["m.homeserver"]: {
      base_url: string;
      server_name: string;
    };
  };

  // Describes the LiveKit configuration to be used.
  livekit?: {
    // The link to the service that returns a livekit url and token to use it.
    // This is a fallback link in case the homeserver in use does not advertise
    // a livekit service url in the client well-known.
    // The well known needs to be formatted like so:
    // {"type":"livekit", "livekit_service_url":"https://livekit.example.com"}
    // and stored under the key: "livekit_focus"
    livekit_service_url: string;
  };

  /**
   * TEMPORARY experimental features.
   */
  features?: {
    /**
     * Allow to join group calls without audio and video.
     */
    feature_group_calls_without_video_and_audio?: boolean;
    /**
     * Send device-specific call session membership state events instead of
     * legacy user-specific call membership state events.
     * This setting has no effect when the user joins an active call with
     * legacy state events. For compatibility, Element Call will always join
     * active legacy calls with legacy state events.
     */
    feature_use_device_session_member_events?: boolean;
  };

  /**
   * A link to the end-user license agreement (EULA)
   */
  eula: string;

  media_devices?: {
    /**
     * Defines whether participants should start with audio enabled by default.
     */
    enable_audio?: boolean;
    /**
     * Defines whether participants should start with video enabled by default.
     */
    enable_video?: boolean;
  };

  /**
   * Whether upon entering a room, the user should be prompted to launch the
   * native mobile app. (Affects only Android and iOS.)
   *
   * Note that this can additionally be disabled by the app's URL parameters.
   */
  app_prompt?: boolean;
}

// Overrides members from ConfigOptions that are always provided by the
// default config and are therefore non-optional.
export interface ResolvedConfigOptions extends ConfigOptions {
  default_server_config: {
    ["m.homeserver"]: {
      base_url: string;
      server_name: string;
    };
  };
  media_devices: {
    enable_audio: boolean;
    enable_video: boolean;
  };
  app_prompt: boolean;
  show_non_member_participants: boolean;
}

export const DEFAULT_CONFIG: ResolvedConfigOptions = {
  default_server_config: {
    ["m.homeserver"]: {
      base_url: "http://localhost:8008",
      server_name: "localhost",
    },
  },
  eula: "https://static.element.io/legal/online-EULA.pdf",
  media_devices: {
    enable_audio: true,
    enable_video: true,
  },
  app_prompt: true,
  show_non_member_participants: false,
};
