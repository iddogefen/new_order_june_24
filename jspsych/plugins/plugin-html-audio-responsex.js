var jsPsychHtmlAudioResponsex = (function (jspsych) {
    'use strict';
  
    const info = {
        name: "html-audio-responsex",
        parameters: {
            stimulus: {
                type: jspsych.ParameterType.HTML_STRING,
                default: undefined,
            },
            stimulus_duration: {
                type: jspsych.ParameterType.INT,
                default: null,
            },
            recording_duration: {
                type: jspsych.ParameterType.INT,
                default: 2000,
            },
            show_done_button: {
                type: jspsych.ParameterType.BOOL,
                default: true,
            },
            done_button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Continue",
            },
            record_again_button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Record again",
            },
            accept_button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Continue",
            },
            allow_playback: {
                type: jspsych.ParameterType.BOOL,
                default: false,
            },
            save_audio_url: {
                type: jspsych.ParameterType.BOOL,
                default: false,
            },
        },
    };
  
    class HtmlAudioResponsePlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
            this.rt = null;
            this.recorded_data_chunks = [];
        }
  
        trial(display_element, trial) {
            this.recorder = this.jsPsych.pluginAPI.getMicrophoneRecorder();
            this.setupRecordingEvents(display_element, trial);
            this.startRecording();
        }
  
        showDisplay(display_element, trial) {
            const ro = new ResizeObserver((entries, observer) => {
                this.stimulus_start_time = performance.now();
                observer.unobserve(display_element);
            });
            ro.observe(display_element);
  
            let html = `<div id="jspsych-html-audio-response-stimulus">${trial.stimulus}</div>`;
            if (trial.show_done_button) {
                html += `<p><button class="jspsych-btn" id="finish-trial">${trial.done_button_label}</button></p>`;
            }
            display_element.innerHTML = html;
        }
  
        hideStimulus(display_element) {
            const el = display_element.querySelector("#jspsych-html-audio-response-stimulus");
            if (el) {
                el.style.visibility = "hidden";
            }
        }
  
        addButtonEvent(display_element, trial) {
            const btn = display_element.querySelector("#finish-trial");
            if (btn) {
                btn.addEventListener("click", () => {
                    const end_time = performance.now();
                    this.rt = Math.round(end_time - this.stimulus_start_time);
                    this.stopRecording().then(() => {
                        if (trial.allow_playback) {
                            this.showPlaybackControls(display_element, trial);
                        } else {
                            this.endTrial(display_element, trial);
                        }
                    });
                });
            }
        }
  
        setupRecordingEvents(display_element, trial) {
            this.data_available_handler = (e) => {
                if (e.data.size > 0) {
                    this.recorded_data_chunks.push(e.data);
                }
            };
  
            this.stop_event_handler = () => {
                const data = new Blob(this.recorded_data_chunks, { type: "audio/webm" });
                this.audio_url = URL.createObjectURL(data);
  
                const reader = new FileReader();
                reader.addEventListener("load", () => {
                    const base64 = reader.result.split(",")[1];
                    this.response = base64;
                    this.load_resolver();
                });
                reader.readAsDataURL(data);
            };
  
            this.start_event_handler = (e) => {
                this.recorded_data_chunks.length = 0;
                this.recorder_start_time = e.timeStamp;
                this.showDisplay(display_element, trial);
                this.addButtonEvent(display_element, trial);
  
                if (trial.stimulus_duration !== null) {
                    this.jsPsych.pluginAPI.setTimeout(() => {
                        this.hideStimulus(display_element);
                    }, trial.stimulus_duration);
                }
  
                if (trial.recording_duration !== null) {
                    this.jsPsych.pluginAPI.setTimeout(() => {
                        if (this.recorder.state !== "inactive") {
                            this.stopRecording().then(() => {
                                if (trial.allow_playback) {
                                    this.showPlaybackControls(display_element, trial);
                                } else {
                                    this.endTrial(display_element, trial);
                                }
                            });
                        }
                    }, trial.recording_duration);
                }
            };
  
            this.recorder.addEventListener("dataavailable", this.data_available_handler);
            this.recorder.addEventListener("stop", this.stop_event_handler);
            this.recorder.addEventListener("start", this.start_event_handler);
        }
  
        startRecording() {
            this.recorder.start();
        }
  
        stopRecording() {
            this.recorder.stop();
            return new Promise((resolve) => {
                this.load_resolver = resolve;
            });
        }
  
        showPlaybackControls(display_element, trial) {
            display_element.innerHTML = `
                <p><audio id="playback" src="${this.audio_url}" controls></audio></p>
                <button id="record-again" class="jspsych-btn">${trial.record_again_button_label}</button>
                <button id="continue" class="jspsych-btn">${trial.accept_button_label}</button>
            `;
  
            display_element.querySelector("#record-again").addEventListener("click", () => {
                URL.revokeObjectURL(this.audio_url);
                this.startRecording();
            });
  
            display_element.querySelector("#continue").addEventListener("click", () => {
                this.endTrial(display_element, trial);
            });
        }
  
        endTrial(display_element, trial) {
            this.recorder.removeEventListener("dataavailable", this.data_available_handler);
            this.recorder.removeEventListener("start", this.start_event_handler);
            this.recorder.removeEventListener("stop", this.stop_event_handler);
  
            this.jsPsych.pluginAPI.clearAllTimeouts();
  
            const trial_data = {
                rt: this.rt,
                stimulus: trial.stimulus,
                response: this.response,
                estimated_stimulus_onset: Math.round(this.stimulus_start_time - this.recorder_start_time),
            };
  
            if (trial.save_audio_url) {
                trial_data.audio_url = this.audio_url;
            } else {
                URL.revokeObjectURL(this.audio_url);
            }
  
            display_element.innerHTML = "";
            this.jsPsych.finishTrial(trial_data);
        }
    }
  
    HtmlAudioResponsePlugin.info = info;
    return HtmlAudioResponsePlugin;
  
  })(jsPsychModule);
  