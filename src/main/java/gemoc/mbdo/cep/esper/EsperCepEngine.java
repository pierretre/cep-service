package gemoc.mbdo.cep.esper;

import com.espertech.esper.common.client.EPCompiled;
import com.espertech.esper.common.client.configuration.Configuration;
import com.espertech.esper.compiler.client.CompilerArguments;
import com.espertech.esper.compiler.client.EPCompileException;
import com.espertech.esper.compiler.client.EPCompiler;
import com.espertech.esper.compiler.client.EPCompilerProvider;
import com.espertech.esper.runtime.client.*;
import gemoc.mbdo.cep.interfaces.CepEngine;
import gemoc.mbdo.cep.engine.model.Event;

public class EsperCepEngine implements CepEngine {

    private EPCompiler compiler;
    private EPRuntime runtime;
    private Configuration configuration;

    private static String queryTemplate = "@name('%s') select * from pattern [%s]";

    public EsperCepEngine() {

        System.out.println("\n=== ESPER CEP: create engine ===\n");

        // Configure Esper
        this.configuration = new Configuration();
        this.configuration.getCommon().addEventType(Event.class);

        // Create runtime
        this.runtime = EPRuntimeProvider.getDefaultRuntime(configuration);
        this.compiler = EPCompilerProvider.getCompiler();

        runtime.destroy();
    }

    @Override
    public void checkPattern(String pattern) throws EPCompileException {
        compile(compiler, pattern, configuration);
    }

    @Override
    public void registerPattern(String pattern, String queryName) throws EPCompileException, EPDeployException {
        var query = String.format(queryTemplate, queryName, pattern);

        EPCompiled compiled = compile(compiler, query, configuration);
        EPDeployment deployment = runtime.getDeploymentService().deploy(compiled);
        EPStatement statement = runtime.getDeploymentService().getStatement(deployment.getDeploymentId(),
                "query");
        statement.addListener((newEvents, oldEvents, stmt, rt) -> {
            for (com.espertech.esper.common.client.EventBean event : newEvents) {
                System.out.println("ESPER: [" +
                        event.get("type") + ", " +
                        event.get("event_count") + ", " +
                        event.get("avg_value") + "]");
            }
        });
    }

    private static EPCompiled compile(EPCompiler compiler, String epl, Configuration configuration)
            throws EPCompileException {
        CompilerArguments args = new CompilerArguments(configuration);
        return compiler.compile(epl, args);
    }
}
