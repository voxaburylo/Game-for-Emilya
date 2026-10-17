Three.js r160 Reflector and Water, MIT license (THREE-LICENSE.txt).
Original unmodified sources:
https://github.com/mrdoob/three.js/blob/r160/examples/jsm/objects/Reflector.js
https://github.com/mrdoob/three.js/blob/r160/examples/jsm/objects/Water.js

reflector.js and water.js are adapted for this game's global Three.js build.
Both now match the input camera type and use inverse-projection oblique
clipping, which supports the orthographic game camera as well as the
perspective window camera. Reflector uses an unsigned-byte render target
with multisampling disabled by the caller for wider mobile compatibility.
Water exposes disposal of its private render target. Original copyright
and license are retained. No remote dependency is needed at runtime.
The saved *.source.js copies only normalize trailing whitespace.
