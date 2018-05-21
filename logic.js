/**
 * Script Healthy Kids
 */


 /**
 *
 * @param {org.acme.model.crearPaquete} creacion
 * @transaction
 */

function crearPaquete(creacion) {
  console.log('Creacion del paquete por parte de la empresa de catering')

  return getAssetRegistry('org.acme.model.Paquete')
    .then(function (registry) {
      var factory = getFactory();
      // Crear paquete.
      var paquete = factory.newResource('org.acme.model', 'Paquete', '555');
      paquete.poseedor = creacion.empresa;
      paquete.estado = 'Elaboracion';
   	  paquete.fecha  = new Date();
      paquete.valoracionServicio = 'SinValorar';
      paquete.numMenuEstandar = creacion.numMenuEstandar;
      paquete.compPrimerPlato = creacion.compPrimerPlato;
      paquete.valorNutPrim = creacion.valorNutPrim;
      paquete.compSegundoPlato = creacion.compSegundoPlato;
      paquete.valorNutSeg = creacion.valorNutSeg;
      paquete.compPostre = creacion.compPostre;
      paquete.valorNutPostre = creacion.valorNutPostre;
      paquete.relacionHPG = creacion.relacionHPG;
      paquete.tiempoElaboracion = creacion.tiempoElaboracion;
      
      if (creacion.numMenuSinGluten > 0 ){
        paquete.numMenuSinGluten = creacion.numMenuSinGluten;
      	paquete.compPrimerPlatoSG = creacion.compPrimerPlatoSG;
      	paquete.valorNutPrimSG = creacion.valorNutPrimSG;
      	paquete.compSegundoPlatoSG = creacion.compSegunPlatoSG;
      	paquete.valorNutSegSG = creacion.valorNutSegSG;
      	paquete.compPostreSG = creacion.compPostreSG;
      	paquete.valorNutPostreSG = creacion.valorNutPostreSG;
      	paquete.relacionHPGSG = creacion.relacionHPGSG;
      	paquete.tiempoElaboracionSG = creacion.tiempoElaboracionSG;
      }
    
	  var assetRegistry;    
	  return getAssetRegistry('org.acme.model.Factura')
      	.then(function (ar){    
      	return query('selectHashFactura', {'hash':creacion.hashFactura})
       		.then(function (results) {
        		if (results.length == 0){
                    throw new Error('No existe factura con ese Hash asociado');
                }
          		
          		var valEmpresa = results.filter(function(fact) {
                	return fact.idEmpresa == creacion.empresa.actorId;
                });
          		
          		if (valEmpresa.length == 0){
                 	throw new Error('La factura no corresponde a la empresa'); 
                }
          		
        		paquete.hashFactura = creacion.hashFactura;			
      			return registry.add(paquete);
      		})
      })
	})
}


 /**
 *
 * @param {org.acme.model.envioPaquete} envio
 * @transaction
 */

function enviopaquete(envio) {
    console.log('Envio del paquete');

    if (envio.paquete.hashFactura == '' ) {
        throw new Error('Para realizar el envio es necesario el hash de la factura');
    }
 
      if (envio.paquete.estado !== 'Elaboracion') {
        throw new Error('El paquete no se encuentra en estado Elaboracion');
    }
 
     // Cambio de estado del paquete
     envio.paquete.estado = 'Envio';

     // Guardar el registro
    return getAssetRegistry('org.acme.model.Paquete')
  .then(function(ar) {
      return ar.update(envio.paquete);
  })
}


 /**
 *
 * @param {org.acme.model.recepcionPaquete} recepcion
 * @transaction
 */

function recepcionpaquete(recepcion) {
    console.log('Llegada del paquete');

    if (recepcion.colegio.empContratada.actorId !== recepcion.paquete.poseedor.actorId ) {
        throw new Error('Datos incoherentes: La empresa no coincide con la contratada');
    }
  
  	if (recepcion.paquete.estado !== 'Envio') {
        throw new Error('El paquete no tiene el estado correspondiente');
    }
  
     // Cambio de estado del paquete
    recepcion.paquete.estado = 'Recibido';

     // Cambio de poseedor del paquete
     recepcion.paquete.poseedor = recepcion.colegio;

     // Guardar el registro
    return getAssetRegistry('org.acme.model.Paquete')
  .then(function(ar) {
      return ar.update(recepcion.paquete);
  })
}

 /**
 *
 * @param {org.acme.model.valoracionPaquete} valoracion
 * @transaction
 */

function valoracionpaquete(valoracion) {
    console.log('Valoracion de la entrega por parte del centro escolar');

    if (valoracion.colegio.actorId !== valoracion.paquete.poseedor.actorId ) {
        throw new Error('El colegio no es propietario del paquete');
    }

    if (valoracion.paquete.valoracionServicio !== 'SinValorar' ){
       throw new Error('El paquete ya ha sido valorado');
    }
  
  	 // Comprobacion para numero de menus
  
  	var total = valoracion.menusOK + valoracion.menusKO;
  
    if (valoracion.paquete.numMenuEstandar != total ){
      throw new Error('El numero de valoraciones no coincide');
    }
  
  	var porcentaje = valoracion.paquete.numMenuEstandar / 10;
    
    if (valoracion.menusKO > porcentaje ){
       console.log('El numero de menus en mal estado excede el 10 por ciento');
    }  
  
     // Cambio de valoracion del paquete
    valoracion.paquete.valoracionServicio = valoracion.valoracionNut;
	
  	// Cambio de estado del paquete
  	if (valoracion.valoracionNut == 'OK' ){
    	valoracion.paquete.estado = 'Consumido';
    }
  
  	
  	if (valoracion.valoracionNut == 'KO' ){
    	valoracion.paquete.estado = 'Rechazado';
 		//Crear incidencia en caso de paquete KO
  		return getAssetRegistry('org.acme.model.Incidencia')
        .then(function (registry) {
            var factory = getFactory();
            // Crear incidencia.
            var incidencia = factory.newResource('org.acme.model', 'Incidencia', '555');
          	incidencia.paquete = valoracion.paquete;
            incidencia.empresaIncidencia = valoracion.paquete.poseedor.empContratada;
            incidencia.fecha = new Date();
          	if (valoracion.descripcion != '' ){
    			incidencia.descripcion = valoracion.descripcion;
    		}
            
          	getAssetRegistry('org.acme.model.Paquete')
          	registry.update(valoracion.paquete);
            // Añadir incidencia al registro.
            return registry.add(incidencia);
        })
      .then(function (){
          return getAssetRegistry('org.acme.model.Paquete')
  		  .then(function(ar) {
      		return ar.update(valoracion.paquete);
          })  
        })
        
	}
    
    // Guardar el registro
    return getAssetRegistry('org.acme.model.Paquete')
  		.then(function(ar) {
      return ar.update(valoracion.paquete);
  })
}

 /**
 *
 * @param {org.acme.model.compraMateria} compra
 * @transaction
 */

function compramateria(compra) {
    console.log('Compra de materia prima por parte de la empresa de catering, generacion de factura')
    
  	return getAssetRegistry('org.acme.model.Factura')
      .then(function (registry) {
        var factory = getFactory();
        // Crear factura.
        var factura = factory.newResource('org.acme.model', 'Factura', '555');
      	factura.materiaPrima = compra.materiaPrima;
      	factura.proveedor = compra.proveedor;
      	factura.fecha = new Date();
      	factura.idEmpresa = compra.empresa.actorId;

      	var concatHash = compra.materiaPrima + compra.proveedor + new Date();
      	var hashFactura = concatHash.hashCode();
        factura.hashFactura = hashFactura.toString();
      
      	if (compra.descripcion != '' ){
    		factura.descripcion = compra.descripcion;
    	}
        
      	return registry.add(factura);
  })
}

String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length == 0) {
        return hash;
    }
    for (var i = 0; i < this.length; i++) {
        var char = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

/**
 *
 * @param {org.acme.model.crearPrograma} creacion
 * @transaction
 */

function crearPrograma(creacion) {
  console.log('Creacion del programa por parte de la empresa de catering')

  return getAssetRegistry('org.acme.model.Programa')
    .then(function (registry) {
      var factory = getFactory();
      // Crear programa.
    var programa = factory.newResource('org.acme.model', 'Programa', creacion.programaId);
      programa.poseedor = creacion.empresa;
      programa.estado = 'Iniciado';
      programa.valoracionServicio = 'SinValorar';
      programa.fecha  = new Date();
      programa.lunesPrimerPlato = creacion.lunesPrimerPlato;
      programa.lunesSegundoPlato = creacion.lunesSegundoPlato;
      programa.lunesPostre = creacion.lunesPostre;
      programa.lunesvalorNut = creacion.lunesvalorNut;
      programa.lunesCena = creacion.lunesCena;
      programa.martesPrimerPlato = creacion.martesPrimerPlato;
      programa.martesSegundoPlato = creacion.martesSegundoPlato;
      programa.martesPostre = creacion.martesPostre;
      programa.martesvalorNut = creacion.martesvalorNut;
      programa.martesCena = creacion.martesCena;
      programa.miercolesPrimerPlato = creacion.miercolesPrimerPlato;
      programa.miercolesSegundoPlato = creacion.miercolesSegundoPlato;
      programa.miercolesPostre = creacion.miercolesPostre;
      programa.miercolesvalorNut = creacion.miercolesvalorNut;
      programa.miercolesCena = creacion.miercolesCena;
      programa.juevesPrimerPlato = creacion.juevesPrimerPlato;
      programa.juevesSegundoPlato = creacion.juevesSegundoPlato;
      programa.juevesPostre = creacion.juevesPostre;
      programa.juevesvalorNut = creacion.juevesvalorNut;
      programa.juevesCena = creacion.juevesCena;
      programa.viernesPrimerPlato = creacion.viernesPrimerPlato;
      programa.viernesSegundoPlato = creacion.viernesSegundoPlato;
      programa.viernesPostre = creacion.viernesPostre;
      programa.viernesvalorNut = creacion.viernesvalorNut;
      programa.viernesCena = creacion.viernesCena;
      programa.empresa == creacion.empresa.actorId
      return registry.add(programa);
    })
}

 /**
 *
 * @param {org.acme.model.envioPrograma} envio
 * @transaction
 */

function envioprograma(envio) {
    console.log('Envio del programa');

      if (envio.programa.estado !== 'Iniciado') {
        throw new Error('El programa no se encuentra en estado Iniciado');
    }
 
     // Cambio de estado del paquete
     envio.programa.estado = 'Enviado';

     // Guardar el registro
    return getAssetRegistry('org.acme.model.Programa')
  .then(function(ar) {
      return ar.update(envio.programa);
  })
}

 /**
 *
 * @param {org.acme.model.recepcionPrograma} recepcion
 * @transaction
 */

function recepcionprograma(recepcion) {
    console.log('Llegada del programa');

    if (recepcion.colegio.empContratada.actorId !== recepcion.programa.poseedor.actorId ) {
        throw new Error('Datos incoherentes: La empresa no coincide con la contratada');
    }
 
      if (recepcion.programa.estado !== 'Enviado') {
        throw new Error('El programa no tiene el estado correspondiente');
    }
 
     // Cambio de estado del programa
    recepcion.programa.estado = 'Recibido';

     // Cambio de poseedor del programa
     recepcion.programa.poseedor = recepcion.colegio;

     // Guardar el registro
    return getAssetRegistry('org.acme.model.Programa')
  .then(function(ar) {
      return ar.update(recepcion.programa);
  })
}
