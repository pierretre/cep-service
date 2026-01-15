package gemoc.mbdo.cep;

import gemoc.mbdo.cep.esper.EsperCepDemo;
import gemoc.mbdo.cep.flink.FlinkCepDemo;

public class ComparisonRunner {

    public static void main(String[] args) throws Exception {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("CEP COMPARISON: FLINK vs ESPER");
        System.out.println("=".repeat(60) + "\n");

        // Run Flink CEP Demo
        System.out.println(">>> RUNNING FLINK CEP DEMO <<<\n");
        FlinkCepDemo.main(args);

        System.out.println("\n" + "-".repeat(60) + "\n");

        // Run Esper CEP Demo
        System.out.println(">>> RUNNING ESPER CEP DEMO <<<\n");
        EsperCepDemo.main(args);

        System.out.println("\n" + "=".repeat(60));
        System.out.println("COMPARISON COMPLETE");
        System.out.println("=".repeat(60) + "\n");
    }
}
