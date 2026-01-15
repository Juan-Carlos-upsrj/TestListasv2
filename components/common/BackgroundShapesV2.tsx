
import React from 'react';

const CurvedLine: React.FC<{ style?: React.CSSProperties, isBlue?: boolean }> = ({ style, isBlue }) => {
    const baseClass = "absolute w-[30vw] h-[30vw] border-2 rounded-full opacity-20 dark:opacity-10";
    const yellowClass = "border-transparent border-t-accent-yellow border-l-accent-yellow";
    const blueClass = "border-transparent border-t-accent-blue border-r-accent-blue";
    
    return <div className={`${baseClass} ${isBlue ? blueClass : yellowClass}`} style={style} />;
};


const BackgroundShapesV2: React.FC = () => {
  return (
    <div className="absolute inset-0 z-[1] overflow-hidden motion-reduce:hidden pointer-events-none bg-background/50" aria-hidden="true">
      {/* Esquina Superior Izquierda: Forma Roja */}
      <div className="absolute opacity-[0.12] dark:opacity-[0.08] w-[35vw] h-[35vw] min-w-[300px] min-h-[300px] -top-[10vw] -left-[12vw] rounded-[45%_55%_60%_40%_/_50%_40%_60%_50%] bg-accent-red transform -rotate-20" />
      
      {/* Esquina Superior Izquierda: Forma Azul Oscura (superpuesta) */}
      <div className="absolute opacity-[0.15] dark:opacity-[0.1] w-[30vw] h-[30vw] min-w-[250px] min-h-[250px] -top-[15vw] left-[5vw] rounded-[50%_40%_55%_45%_/_40%_60%_40%_60%] bg-primary transform rotate-15" />

      {/* Esquina Superior Derecha: Forma Amarilla */}
      <div className="absolute opacity-[0.15] dark:opacity-[0.1] w-[45vw] h-[45vw] min-w-[400px] min-h-[400px] -top-[10vw] -right-[15vw] rounded-[40%_60%_45%_55%_/_50%_45%_55%_50%] bg-accent-yellow transform rotate-30" />

      {/* Centro: Curva "S" Verde Pastel */}
      <div className="absolute opacity-[0.12] dark:opacity-[0.08] w-[60vw] h-[60vw] min-w-[450px] min-h-[450px] top-[5vh] -right-[5vw] rounded-[60%_40%_30%_70%_/_50%_60%_40%_50%] bg-accent-green transform -rotate-30" />
      <div className="absolute opacity-[0.12] dark:opacity-[0.08] w-[60vw] h-[60vw] min-w-[450px] min-h-[450px] top-[20vh] -left-[10vw] rounded-[30%_70%_60%_40%_/_40%_50%_50%_60%] bg-accent-green transform rotate-20" />

      {/* Círculo Rojo (Medio Derecha) */}
      <div className="absolute opacity-[0.15] dark:opacity-[0.1] w-20 h-20 rounded-full bg-accent-red top-[45vh] right-[18vw]" />

      {/* Formas Inferiores */}
      <div className="absolute opacity-[0.12] dark:opacity-[0.08] w-[40vw] h-[20vw] min-w-[300px] min-h-[150px] -bottom-[10vw] left-[20vw] rounded-t-full bg-accent-red-light transform -rotate-15" />
      <div className="absolute opacity-[0.08] dark:opacity-[0.05] w-[30vw] h-[15vw] min-w-[250px] min-h-[120px] -bottom-[8vw] left-[40vw] rounded-t-full bg-primary transform rotate-10" />
      
      {/* Líneas Curvas */}
      <CurvedLine style={{ top: '10vh', left: '10vw', transform: 'rotate(-30deg)' }} />
      <CurvedLine style={{ top: '5vh', left: '20vw', transform: 'rotate(15deg) scaleX(-1)' }} />
      <CurvedLine style={{ top: '15vh', right: '10vw', transform: 'rotate(45deg)' }} isBlue />
      <CurvedLine style={{ top: '10vh', right: '20vw', transform: 'rotate(-15deg) scaleX(-1)' }} isBlue />
      <CurvedLine style={{ bottom: '10vh', left: '5vw', transform: 'rotate(70deg)' }} />
      <CurvedLine style={{ bottom: '15vh', left: '15vw', transform: 'rotate(90deg)' }} isBlue />
      <CurvedLine style={{ bottom: '5vh', right: '10vw', transform: 'rotate(-60deg)' }} />
    </div>
  );
};

export default BackgroundShapesV2;
