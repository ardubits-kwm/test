input.onButtonPressed(Button.A, function () {
    minilfr.motorSpeed(255, 255)
})
input.onButtonPressed(Button.AB, function () {
    minilfr.motorSpeed(0, 0)
})
input.onButtonPressed(Button.B, function () {
    minilfr.motorSpeed(-255, -255)
})
minilfr.minilfrInit()
