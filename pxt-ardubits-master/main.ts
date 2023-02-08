/*
Riven
Microbit extension for kittenbot MiniLFR
load dependency
"minilfr": "file:../pxt-minilfr"
*/
//% color="#91a7ff" weight=10 icon="\uf061"
//% groups='["Car", "Linefollower", "Ultrasonic", "RGB Ring", "Matrix", "Infrared"]'
namespace minilfr {
    type EvtStr = (data: string) => void;

    let sonarValue: number = 0;
    let batteryValue: number = 0;
    let sensorValue: number[] = [0, 0, 0, 0, 0];
    let lastSensorUpdate: number;
    let irHandler: EvtStr = null;
    let asyncFlag: boolean = false;

    let debugSensor: boolean;


    export enum SensorEnum {
        //% block=T1
        A = 0,
        //% block=T2
        B = 1,
        //% block=T3
        C = 2,
        //% block=T4
        D = 3,
        //% block=T5
        E = 4
    }

    export enum LFRMelodies {
        //% block="dadadum" blockIdentity=music.builtInMelody
        Dadadadum = 0,
        //% block="entertainer" blockIdentity=music.builtInMelody
        Entertainer,
        //% block="prelude" blockIdentity=music.builtInMelody
        Prelude,
        //% block="ode" blockIdentity=music.builtInMelody
        Ode,
        //% block="nyan" blockIdentity=music.builtInMelody
        Nyan,
        //% block="ringtone" blockIdentity=music.builtInMelody
        Ringtone,
        //% block="funk" blockIdentity=music.builtInMelody
        Funk,
        //% block="blues" blockIdentity=music.builtInMelody
        Blues,
        //% block="birthday" blockIdentity=music.builtInMelody
        Birthday,
        //% block="wedding" blockIdentity=music.builtInMelody
        Wedding,
        //% block="funereal" blockIdentity=music.builtInMelody
        Funeral,
        //% block="punchline" blockIdentity=music.builtInMelody
        Punchline,
        //% block="baddy" blockIdentity=music.builtInMelody
        Baddy,
        //% block="chase" blockIdentity=music.builtInMelody
        Chase,
        //% block="ba ding" blockIdentity=music.builtInMelody
        BaDing,
        //% block="wawawawaa" blockIdentity=music.builtInMelody
        Wawawawaa,
        //% block="jump up" blockIdentity=music.builtInMelody
        JumpUp,
        //% block="jump down" blockIdentity=music.builtInMelody
        JumpDown,
        //% block="power up" blockIdentity=music.builtInMelody
        PowerUp,
        //% block="power down" blockIdentity=music.builtInMelody
        PowerDown,
    }

    export enum NeoPixelColors {
        //% block=red
        Red = 0xFF0000,
        //% block=orange
        Orange = 0xFFA500,
        //% block=yellow
        Yellow = 0xFFFF00,
        //% block=green
        Green = 0x00FF00,
        //% block=blue
        Blue = 0x0000FF,
        //% block=indigo
        Indigo = 0x4b0082,
        //% block=violet
        Violet = 0x8a2be2,
        //% block=purple
        Purple = 0xFF00FF,
        //% block=white
        White = 0xFFFFFF,
        //% block=black
        Black = 0x000000
    }

    export enum RGBIDX {
        //% block=All
        ALL = 0,
        //% block=Left
        LEFT = 1,
        //% block=Right
        RIGHT = 2
    }

    export enum ONOFF {
        //% block=ON
        ON = 1,
        //% block=OFF
        OFF = 0
    }

    function updateSensorOnMatrix(): void {
        let img = images.createImage(`
            . . . . .
            . . . . .
            . . . . .
            . . . . .
            . . . . .
        `)

        for (let i = 0; i < 5; i++) {
            let v = Math.floor(sensorValue[i] / 167)

            for (let j = 0; j < 5; j++) {
                if (v > j) {
                    img.setPixel(4 - i, 4 - j, true)
                }
            }
        }

        img.showImage(0)
    }

    function trim(t: string): string {
        let idx = t.length - 1
        let ch = t.charCodeAt(idx)
        while (ch == 0x20 || ch == 0x0d || ch == 0x0a) {
            idx--;
            ch = t.charCodeAt(idx)
        }
        return t.substr(0, idx + 1);
    }

    serial.onDataReceived('\n', function () {
        let s = trim(serial.readString())
        let tmp = s.split(" ")
        let c = parseInt(tmp[0].substr(1))
        control.raiseEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 0x8900+c)
        if (tmp[0].includes("TRIG")) {
            if (tmp[1].includes("infra") && irHandler) {
                irHandler(tmp[2])
            }
        } else if (tmp[0].includes("M8")) {
            // tofixed?
            batteryValue = parseFloat(tmp[1])
        } else if (tmp[0].includes("M7")) {
            sonarValue = parseInt(tmp[1])
        } else if (tmp[0].includes("M10")) {
            sensorValue[0] = parseInt(tmp[1])
            sensorValue[1] = parseInt(tmp[2])
            sensorValue[2] = parseInt(tmp[3])
            sensorValue[3] = parseInt(tmp[4])
            sensorValue[4] = parseInt(tmp[5])
            if (debugSensor) {
                updateSensorOnMatrix();
            }
        }

    })

    function asyncWrite(msg: string, evt: number): void {
        serial.writeLine(msg)
        control.waitForEvent(EventBusSource.MES_BROADCAST_GENERAL_ID, 0x8900 + evt)
      }

    //% blockId=minilfr_init block="MiniLFR init"
    //% group="Car" weight=100
    export function minilfrInit(): void {
        serial.redirect(SerialPin.P0, SerialPin.P1, 115200)
        serial.writeString("\n\n")
        serial.setRxBufferSize(64)
        lastSensorUpdate = input.runningTimeMicros()
        basic.pause(300);
    }

    //% blockId=minilfr_goIdle block="Go Idle"
    //% weight=99
    export function goIdle(): void {
        serial.writeLine(`M33`);
        basic.pause(10);
        serial.writeLine(`M33`);
    }

    //% blockId=minilfr_spotlight block="Spotlight Left|%left Right|%right"
    //% group="Car" weight=98
    export function spotLight(left: ONOFF, right: ONOFF): void {
        // serial.writeLine("M6 " + left + " " + right)
        let str = `M6 ${left} ${right}`;
        serial.writeLine(str);
        basic.pause(30);
    }

    //% blockId=minilfr_rgb_brightness block="RGB brightness %brightness"
    //% brightness.min=0 brightness.max=255
    //% group="Car" weight=97
    export function rgbBrightness(brightness: number): void {
        serial.writeLine("M14 " + brightness)
    }

    //% blockId=minilfr_hover_rgb_static block="Hover RGB %idx Color|%color"
    //% group="Car" weight=96
    export function hoverRgbStatic(idx: RGBIDX, color: NeoPixelColors): void {
        let red = (color >> 16) & 0xff;
        let green = (color >> 8) & 0xff;
        let blue = (color) & 0xff;
        // serial.writeLine("M13 " + idx + " " + red + " " + green + " " + blue)
        let str = `M13 ${idx} ${red} ${green} ${blue}`;
        serial.writeLine(str);
        basic.pause(30);
    }

    //% blockId=minilfr_hover_rgb block="Hover RGB %idx|red %r green %g blue %b"
    //% group="Car" weight=95
    //% r.min=0 r.max=255
    //% g.min=0 g.max=255
    //% b.min=0 b.max=255
    export function hoverRgb(idx: RGBIDX, r: number, g: number, b: number): void {
        // serial.writeLine("M13 " + idx + " " + r + " " + g + " " + b)
        let str = `M13 ${idx} ${r} ${g} ${b}`;
        serial.writeLine(str);
        basic.pause(30);
    }

    //% blockId=minilfr_buzzer block="Buzzer Freq|%freq HZ Duration|%ms ms"
    //% group="Car" weight=94
    export function buzz(freq: number, ms: number): void {
        // serial.writeLine("M18 " + freq + " " + ms)
        let str = `M18 ${freq} ${ms}`;
        serial.writeLine(str);
    }

    /**
     * Buzzer music
     * @param music Music music; eg: c4:4
    */
    //% blockId=minilfr_buzzer_music block="Buzzer Music %music"
    //% group="Car" weight=93
    export function buzzMusic(music: string): void {
        // serial.writeLine("M17 " + music + " ")
        let str = `M17 ${music} `;
        // serial.writeLine(str);
        serial.writeString(str);
        serial.writeString(`\r\n`);
    }

    //% blockId=minilfr_buzzer_localmusic block="Buzzer Music %idx"
    //% group="Car" weight=92
    export function buzzBuildMusic(idx: LFRMelodies): void {
        // serial.writeLine("M23 " + idx)
        let str = `M23 ${idx}`;
        serial.writeLine(str);
    }

    //% blockId=minilfr_motor block="Motor Speed Left|%left Right|%right"
    //% group="Car" weight=91
    //% right.min=-255 right.max=255
    //% left.min=-255 left.max=255
    export function motorSpeed(left: number, right: number): void {
        // serial.writeLine("M200 " + left + " " + right)
        
        let str = `M200 ${left} ${right}`;
        serial.writeLine(str);
        basic.pause(15);
        
    }

    //% blockId=minilfr_motor_delay block="Motor Speed Left|%left Right|%right Delay|%ms ms"
    //% group="Car" weight=90
    //% right.min=-255 right.max=255
    //% left.min=-255 left.max=255
    export function motorSpeedDelay(left: number, right: number, ms: number): void {
        // serial.writeLine("M202 " + left + " " + right + " " + ms)
        // basic.pause(ms);
        // motorStop();
        // basic.pause(10);
        let str = `M202 ${left} ${right} ${ms}`;
        serial.writeLine(str);
        basic.pause(ms);
    }

    //% blockId=minilfr_motor_stop block="Motor Stop"
    //% group="Car" weight=89
    export function motorStop(): void {
        // serial.writeLine("M200 0 0")
        let str = `M200 0 0`;
        serial.writeLine(str);
        basic.pause(15);
    }

    //% blockId=minilfr_goObjavoid block="Go object avoid mode"
    //% group="Ultrasonic" weight=80
    export function goObjavoid(): void {
        serial.writeLine("M32")
    }

    //% blockId=minilfr_ultrasonic block="Ultrasonic"
    //% group="Ultrasonic" weight=79
    //% promise
    export function Ultrasonic(): number {
        // serial.writeLine("M7")
        let str = `M7`
        // asyncWrite(str, 7)
        serial.writeLine(str);
        basic.pause(15);
        return sonarValue;
    }

    //% blockId=minilfr_ult_rgb block="Ultrasonic RGB %idx|red %r green %g blue %b"
    //% group="Ultrasonic" weight=77
    //% r.min=0 r.max=255
    //% g.min=0 g.max=255
    //% b.min=0 b.max=255
    export function UltrasonicRgb(idx: RGBIDX, r: number, g: number, b: number): void {
        // serial.writeLine("M16 " + idx + " " + r + " " + g + " " + b)
        let str = `M16 ${idx} ${r} ${g} ${b} `;
        serial.writeLine(str);
        basic.pause(30);
    }

    //% blockId=minilfr_ult_rgb_static block="Ultrasonic RGB %idx Color %color"
    //% group="Ultrasonic" weight=78
    export function UltrasonicRgbStatic(idx: RGBIDX, color: NeoPixelColors): void {
        let red = (color >> 16) & 0xff;
        let green = (color >> 8) & 0xff;
        let blue = (color) & 0xff;
        serial.writeLine("M16 " + idx + " " + red + " " + green + " " + blue)
        basic.pause(30);
    }

    /**
     * rgb idex
     * @param idx rgb index; eg: 1
    */
    //% blockId=minilfr_ring block="Ring RGB %idx|red %r green %g blue %b"
    //% group="RGB Ring" weight=59
    //% idx.min=1 idx.max=15
    //% r.min=0 r.max=255
    //% g.min=0 g.max=255
    //% b.min=0 b.max=255
    export function RingRgb(idx: number, r: number, g: number, b: number): void {
        // serial.writeLine("M22 " + idx + " " + r + " " + g + " " + b)
        let str = `M22 ${idx} ${r} ${g} ${b} `;
        serial.writeLine(str);
        control.waitMicros(1000*80)
        // serial.writeLine(str);     
    }

    /**
     * rgb idex
     * @param idx rgb index; eg: 1
    */
    //% blockId=minilfr_ring_static block="Ring RGB %idx Color %color"
    //% group="RGB Ring" weight=60
    //% idx.min=1 idx.max=15
    export function RingRgbStatic(idx: number, color: NeoPixelColors): void {
        let red = (color >> 16) & 0xff;
        let green = (color >> 8) & 0xff;
        let blue = (color) & 0xff;
        // serial.writeLine("M22 " + idx + " " + red + " " + green + " " + blue)
        let str = `M22 ${idx} ${red} ${green} ${blue} `;
        serial.writeLine(str);
        control.waitMicros(1000*80)
        // serial.writeLine(str);
    }

    //% blockId=minilfr_ring_all block="Ring RGB All red %r green %g blue %b"
    //% group="RGB Ring" weight=57
    //% r.min=0 r.max=255
    //% g.min=0 g.max=255
    //% b.min=0 b.max=255
    export function RingAll(r: number, g: number, b: number): void {
        // serial.writeLine("M22 " + 0 + " " + r + " " + g + " " + b)
        let str = `M22 0 ${r} ${g} ${b} `;
        serial.writeLine(str);
        control.waitMicros(1000*80)
        // serial.writeLine(str);
    }

    //% blockId=minilfr_ring_all_static block="Ring RGB All Color %color"
    //% group="RGB Ring" weight=58
    export function RingAllRgbStatic(color: NeoPixelColors): void {
        let red = (color >> 16) & 0xff;
        let green = (color >> 8) & 0xff;
        let blue = (color) & 0xff;
        // serial.writeLine("M22 " + 0 + " " + red + " " + green + " " + blue)
        let str = `M22 0 ${red} ${green} ${blue} `;
        serial.writeLine(str);
        control.waitMicros(1000*80)
    }

    //% blockId=minilfr_sensorcali block="Sensor Calibrate"
    //% group="Linefollower" weight=50
    export function calibrateSensor(): void {
        serial.writeLine("M310")
    }

    //% blockId=minilfr_golinefollow block="Go linefollow mode"
    //% group="Linefollower" weight=49
    export function goLinefollow(): void {
        serial.writeLine("M31")
    }

    //% blockId=minilfr_getsensor block="Get sensor %sensor Value"
    //% group="Linefollower" weight=48
    export function GetSensor(): void {
        let str = `M10`
        asyncWrite(str, 10)
    }

    //% blockId=minilfr_sensorread block="Sensor %sensor Value"
    //% group="Linefollower" weight=47
    export function SensorRead(sensor: SensorEnum): number {
        return sensorValue[sensor];
    }
        
    
    //% blockId=minilfr_setsensordbg block="Set Sensordebug %dgb"
    //% group="Linefollower" weight=46
    export function setSensorDebug(dgb: boolean): void {
        debugSensor = dgb
    }

    //% blockId=minilfr_infra_send block="Infra Send %data"
    //% group="Infrared" weight=30
    export function infraSend(data: string): void {
        serial.writeLine("M12 " + data)
    }

    //% blockId=minilfr_onirrx block="on Infra Got"
    //% group="Infrared" weight=29
    export function onInfraGot(handler: (irdata: string) => void): void {
        irHandler = handler;
    }

    //% blockId=minilfr_getmotodiff block="Get MotorDiff"
    //% weight=48
    //% advanced=true
    export function getMotorDiff(): number {
        serial.writeLine("M210")
        return 0;
    }

    //% blockId=minilfr_setmotodiff block="Set MotorDiff %diff"
    //% weight=47
    //% advanced=true
    export function setMotorDiff(diff: number): void {
        serial.writeLine("M209 " + diff)
    }

    //% blockId=minilfr_battery block="Battery Voltage"
    //% weight=51
    //% advanced=true
    export function BatteryVoltage(): number {
        serial.writeLine("M8")
        return batteryValue;
    }

}
